import { assert, describe, it } from 'vitest';

import { OperationalError } from '../errors.js';
import C from '../factory.js';
import { extractValues } from '../flags/parsing.js';
import type { Flag, SupportedValue } from '../flags/types.js';
import {
  checkConversionAsync,
  createTestContext,
  ensure,
  T
} from '../tests.js';
import type { DistributiveOmit } from '../types/utils.js';
import { transformValues } from '../utils.js';
import { parseCommand } from './parsing.js';
import type { CommandTree } from './types.js';

const description = 'description';
const handler = async () => {};
const context = createTestContext();

describe('parseCommand', () => {
  it('extracts a command from args', () => {
    const result = parseCommand(['testing'], {
      testing: C(description, handler)
    });

    assert(result.type === 'command', 'Command not parsed');
    const { command, run } = result;

    assert.equal(command.command.description, description);
    assert.deepEqual(command.flags, {});
    assert.sameOrderedMembers(command.path, ['testing']);
    assert.isFunction(run);
  });

  it('can parse hidden commands', async () => {
    const result = parseCommand(['hidden'], {
      hidden: C({ description, handler, hidden: true })
    });

    assert(result.type === 'command', 'Hidden command not parsed');
  });

  it('rejects inherited object property names that are not defined commands', () => {
    const result = parseCommand(['constructor'], {
      testing: C(description, handler)
    });

    assert(
      result.type === 'error',
      'Inherited property was treated as a command'
    );

    assert.include(result.message, 'Unknown command: constructor');
  });

  it('parses commands that use inherited object property names', async () => {
    const result = parseCommand(['constructor'], {
      constructor: C(description, handler)
    });

    assert(result.type === 'command', 'Defined constructor command not parsed');
  });

  it('extracts the requested command from args', () => {
    const commands = {
      alfa: C('alfa', handler),
      bravo: C('bravo', handler)
    };

    const alfa = parseCommand(['alfa'], commands);
    const bravo = parseCommand(['bravo'], commands);

    assert.equal(
      alfa.type === 'command' ? alfa.command.command.description : '',
      'alfa',
      'alfa command not parsed'
    );

    assert.equal(
      bravo.type === 'command' ? bravo.command.command.description : '',
      'bravo',
      'bravo command not parsed'
    );
  });

  it('can extract grouped commands', () => {
    const commands = {
      alfa: C.group(description, {
        bravo: C(description, handler),
        charlie: C.group(description, {
          delta: C(description, handler)
        })
      })
    };

    const shallow = parseCommand(['alfa', 'bravo'], commands);
    const deep = parseCommand(['alfa', 'charlie', 'delta'], commands);

    assert.sameOrderedMembers(
      shallow.type === 'command' ? shallow.command.path : [],
      ['alfa', 'bravo'],
      'Nested command not resolved'
    );

    assert.sameOrderedMembers(
      deep.type === 'command' ? deep.command.path : [],
      ['alfa', 'charlie', 'delta'],
      'Doubly nested command not resolved'
    );
  });

  it('handles repeated command names in nested groups', () => {
    const commands = {
      alfa: C.group(description, {
        alfa: C.group(description, {
          alfa: C(description, handler)
        })
      })
    };

    const parsed = parseCommand(['alfa', 'alfa', 'alfa'], commands);

    assert(parsed.type === 'command', 'Command not parsed');
    assert.deepEqual(parsed.command.path, ['alfa', 'alfa', 'alfa']);
  });

  it('handles commands with overlapping prefixes', () => {
    const commands = {
      alfa: C('alfa', handler),
      'alfa-one': C('bravo', handler)
    };

    const alfa = parseCommand(['alfa'], commands);
    const bravo = parseCommand(['alfa-one'], commands);

    assert.equal(
      alfa.type === 'command' ? alfa.command.command.description : '',
      'alfa'
    );

    assert.equal(
      bravo.type === 'command' ? bravo.command.command.description : '',
      'bravo'
    );
  });

  it('handles deeply nested commands', () => {
    let commands: CommandTree = {};
    const args: string[] = [];

    for (let i = 3000; i >= 0; i--) {
      const name = `command-${i}`;
      args.push(name);

      commands = { [name]: C.group(description, commands) };
    }

    const result = parseCommand([...args.reverse(), '--help'], commands);
    assert(result.type === 'help', 'Command not handled');
  });

  it('returns an error when no args are given', () => {
    const result = parseCommand([], {
      alfa: C(description, handler)
    });

    assert.deepInclude(result, {
      code: 'invalid-command',
      message: 'You must provide a command',
      type: 'error'
    });

    assert(result.type === 'error', 'Error not returned');
    assert.equal(result.help?.type, 'root');
  });

  it('returns an error when no command matches the given args', () => {
    const result = parseCommand(['alfa'], {
      bravo: C(description, handler)
    });

    assert(result.type === 'error', 'Error not returned');
    assert.equal(result.help?.type, 'root');

    assert.deepInclude(result, {
      code: 'invalid-command',
      message: 'Unknown command: alfa',
      type: 'error'
    });
  });

  it('returns an error when a command group is requested', () => {
    const result = parseCommand(['alfa', 'bravo'], {
      alfa: C.group(description, {
        bravo: C.group(description, {
          charlie: C(description, handler)
        })
      })
    });

    assert(result.type === 'error', 'Error not returned');
    assert.equal(result.help?.type, 'group');

    assert.deepInclude(result, {
      code: 'invalid-command',
      message: 'You must provide a subcommand: alfa bravo <subcommand>',
      type: 'error'
    });
  });

  it('extracts flags for commands', () => {
    function check(
      args: string[],
      commands: CommandTree
    ) {
      const result = parseCommand(args, commands);

      if (result.type === 'command') {
        return extractValues(result.command.flags);
      } else {
        assert.fail(`No flags parsed for args: ${args.join(' ')}`);
      }
    }

    const commands = {
      alfa: C(description, {
        'alfa-string': {
          description,
          type: 'string'
        }
      }, handler),
      bravo: C(description, {
        'bravo-string': {
          description,
          type: 'string'
        }
      }, handler)
    };

    assert.deepEqual(
      check(['alfa', '--alfa-string', 'alfa'], commands),
      { 'alfa-string': 'alfa' },
      'alfa command not parsed'
    );

    assert.deepEqual(
      check(['bravo', '--bravo-string', 'bravo'], commands),
      { 'bravo-string': 'bravo' },
      'bravo command not parsed'
    );
  });

  it('exposes a command’s parsed flags to its handler', () =>
    checkConversionAsync<
      [Record<string, DistributiveOmit<Flag, 'description'>>, string[]],
      Record<string, SupportedValue>
    >(
      async ([flags, args], output, message) => {
        let values: Record<string, SupportedValue> = {};
        let parsedArgs: string[] = [];

        const result = parseCommand(['command', ...args], {
          command: C(
            description,
            transformValues(flags, flag => ({ ...flag, description })),
            async (parsed, { args }) => {
              values = parsed as Record<string, SupportedValue>;
              parsedArgs = args.parsed;
            }
          )
        });

        assert(result.type === 'command', `Command not parsed: ${message}`);
        await result.run(context);

        assert.deepStrictEqual(
          values,
          output,
          `Unexpected flags for args: ${args.join(' ')}`
        );

        assert.sameOrderedMembers(
          args,
          parsedArgs,
          'Reported raw args did not match the input args'
        );
      },
      [
        [[{}, []], {}],
        [
          [
            {
              'boolean-off': { type: 'boolean' },
              'boolean-on': { type: 'boolean' },
              'number-off': { type: 'number' },
              'number-on': { type: 'number' },
              'string-off': { type: 'string' },
              'string-on': { type: 'string' }
            },
            ['--boolean-on', '--string-on', '1', '--number-on', '1']
          ],
          {
            'boolean-off': false,
            'boolean-on': true,
            'number-on': 1,
            'string-on': '1'
          }
        ],
        [
          [
            {
              boolean: { default: true, type: 'boolean' },
              number: { default: 1, type: 'number' },
              string: { default: '1', type: 'string' }
            },
            []
          ],
          {
            boolean: true,
            number: 1,
            string: '1'
          }
        ],
        [
          [
            {
              absent: { type: 'boolean' },
              on: { default: true, type: 'boolean' },
              off: { default: false, type: 'boolean' }
            },
            []
          ],
          {
            absent: false,
            on: true,
            off: false
          }
        ]
      ]
    ));

  it('returns an error if an unknown flag is provided', () => {
    const cases: Array<string[]> = [
      ['command', '--invalid'],
      ['command', '--valid', 'value', '--invalid']
    ];

    cases.forEach((args) => {
      assert.deepInclude(
        parseCommand(args, {
          command: C(description, {
            valid: {
              description,
              type: 'string'
            }
          }, handler)
        }),
        {
          code: 'invalid-flag',
          message: 'Unknown flag: --invalid',
          type: 'error'
        },
        `Invalid flag allowed with args: ${args.join(' ')}`
      );
    });
  });

  it('exposes parsed and extra args when allowing unknown flags', () => {
    const cases: Array<[args: string[], extra: string[], parsed: string[]]> = [
      [['command'], [], []],
      [['command', '--other', '--flag'], ['--other', '--flag'], []],
      [
        ['command', '--other', '--boolean', '--string', 'value', '--flag'],
        ['--other', '--flag'],
        ['--boolean', '--string', 'value']
      ],
      [
        ['command', '--boolean', '--other', '--flag', '--string', 'value'],
        ['--other', '--flag'],
        ['--boolean', '--string', 'value']
      ],
      [
        ['command', '--boolean', '--string', 'value'],
        [],
        ['--boolean', '--string', 'value']
      ]
    ];

    cases.forEach(([input, extra, parsed]) => {
      const result = parseCommand(input, {
        command: C(description, {
          boolean: { description, type: 'boolean' },
          string: { description, type: 'string' }
        }, handler)
      }, { allowUnknownFlags: true });

      assert(
        result.type === 'command',
        `Command not parsed: ${input.join(' ')}`
      );

      const { args } = result.command;

      assert.sameOrderedMembers(
        args.extra,
        extra,
        `Incorrect parsed arguments input args: ${input.join(' ')}`
      );

      assert.sameOrderedMembers(
        args.parsed,
        parsed,
        `Incorrect parsed arguments input args: ${input.join(' ')}`
      );
    });
  });

  it('provides parsing details to a command’s handler', async () => {
    const result = parseCommand(
      ['parent', 'command', '--string', 'value', '--other'],
      {
        parent: C.group(description, {
          command: C(
            description,
            {
              absent: { description, type: 'string' },
              string: { description, type: 'string' }
            },
            async (_, parsing) => {
              assert.sameOrderedMembers(parsing.commandPath, [
                'parent',
                'command'
              ]);

              assert.equal(parsing.context.meta.name, 'test-cli');

              assert.equal(
                parsing.commands.parent?.description,
                description
              );
            }
          )
        })
      },
      { allowUnknownFlags: true }
    );

    assert(result.type === 'command', 'Command not parsed');
    const run = await result.run(createTestContext({ name: 'test-cli' }));

    assert(run.type === 'success', 'Command not run');
    const details = run.command;

    assert.deepEqual(details.args, {
      all: ['--string', 'value', '--other'],
      extra: ['--other'],
      parsed: ['--string', 'value']
    });

    assert.deepEqual(details.path, ['parent', 'command']);
    assert.deepEqual(details.providedFlags, ['string']);
  });

  it('treats a return value from a command handler as primary output', async () => {
    const result = parseCommand(
      ['command'],
      { command: C(description, async () => 'output') }
    );

    assert(result.type === 'command', 'Command not parsed');
    const run = await result.run(createTestContext({ name: 'test-cli' }));

    assert(run.type === 'success', 'Command not run');
    assert.equal(run.output, 'output');
  });

  it('reports whether all supported flags were provided', async () => {
    const command = C(description, {
      boolean: { default: false, description, type: 'boolean' },
      number: { default: 1, description, type: 'number' },
      path: { default: '/', description, type: 'path' },
      string: { default: '1', description, type: 'string' }
    }, async () => {});

    await checkConversionAsync<string[], string[]>(
      async (flags, provided, message) => {
        const parsed = parseCommand(['command', ...flags], { command });

        assert(parsed.type === 'command', `Command not parsed: ${message}`);
        const result = await parsed.run(context);

        assert(result.type === 'success', `Command failed: ${message}`);

        assert.sameMembers(
          result.command.providedFlags,
          provided,
          message
        );
      },
      [
        [[], []],
        [['--boolean'], ['boolean']],
        [['--no-boolean'], ['boolean']],
        [['--number', '2'], ['number']],
        [['--path', '/tmp'], ['path']],
        [['--string', 'value'], ['string']],
        [
          [
            '--boolean',
            '--number',
            '2',
            '--path',
            '/tmp',
            '--string',
            'value'
          ],
          ['boolean', 'number', 'path', 'string']
        ]
      ]
    );
  });

  it('uses narrow types for provided flags in parsing details', async () => {
    C(
      description,
      {
        alfa: { description, type: 'boolean' },
        bravo: { description, type: 'string' }
      },
      async (_, details) => {
        T.assert<
          T.Equivalent<
            (typeof details)['providedFlags'],
            Set<'alfa' | 'bravo'>
          >
        >(true);
      }
    );
  });

  it('returns an error if improperly ordered flags are provided', () => {
    const cases: Array<string[]> = [
      ['parent', '--valid', 'value', 'child'],
      ['--valid', 'value', 'parent', 'child'],
      ['parent', '--valid', 'child'],
      ['--valid', 'parent', 'child']
    ];

    cases.forEach((args) => {
      assert.deepInclude(
        parseCommand(args, {
          parent: C.group(description, {
            child: C(description, {
              valid: {
                description,
                type: 'string'
              }
            }, handler)
          })
        }),
        {
          code: 'invalid-command',
          type: 'error'
        },
        `Invalid flag allowed with args: ${args.join(' ')}`
      );
    });
  });

  it('returns an operational error thrown by a handler', async () => {
    const parsed = parseCommand(['command'], {
      command: C(description, () => {
        throw new OperationalError('@error');
      })
    });

    assert(parsed.type === 'command', 'Command not parsed');
    const result = await parsed.run(context);

    assert(result.type === 'failure', 'Command ran without errors');

    assert.instanceOf(result.error, OperationalError);
    assert.include(result.error.toString(), '@error');
  });

  it('throws an error when a handler throws a non-operational error', async () => {
    const parsed = parseCommand(['command'], {
      command: C(description, () => {
        throw new Error('@error');
      })
    });

    assert(parsed.type === 'command', 'Command not parsed');
    await ensure.rejects(() => parsed.run(context), '@error');
  });

  it('can request help', () => {
    const result = parseCommand(['--help'], {
      command: C(description, handler)
    });

    assert(result.type === 'help', 'Help not requested');
    const { scope } = result;

    assert(scope.type === 'root', 'Root help not requested');

    assert.deepEqual(
      Object.keys(scope.commands),
      ['command'],
      'Command not listed'
    );
  });

  it('can request help for a top-level command', () => {
    const result = parseCommand(['command', '--help'], {
      command: C('description', handler)
    });

    assert(result.type === 'help', 'Help not requested');
    const { scope } = result;

    assert(scope.type === 'command', 'Command help not requested');

    assert.equal(
      scope.command.description,
      'description',
      'Incorrect command selected'
    );

    assert.deepEqual(
      scope.path,
      ['command'],
      'Incorrect path provided'
    );
  });

  it('can request help for a grouped command', () => {
    const result = parseCommand(['alfa', 'bravo', '--help'], {
      alfa: C.group('alfa', {
        bravo: C('bravo', handler)
      })
    });

    assert(result.type === 'help', 'Help not requested');
    const { scope } = result;

    assert(scope.type === 'command', 'Grouped command help not requested');

    assert.equal(
      scope.command.description,
      'bravo',
      'Incorrect command selected'
    );

    assert.deepEqual(
      scope.path,
      ['alfa', 'bravo'],
      'Incorrect path provided'
    );
  });

  it('can request help for a group', () => {
    const result = parseCommand(['alfa', '--help'], {
      alfa: C.group(description, {
        bravo: C(description, handler),
        charlie: C(description, handler)
      })
    });

    assert(result.type === 'help', 'Help not requested');
    const { scope } = result;

    assert(scope.type === 'group', 'Group help not requested');

    assert.sameMembers(
      Object.keys(scope.group.subcommands),
      ['bravo', 'charlie'],
      'Incorrect commands shown'
    );

    assert.deepEqual(scope.path, ['alfa'], 'Incorrect path provided');
  });

  it('respects help requests for otherwise invalid commands', () => {
    const commands: CommandTree = {
      root: C(description, {
        string: {
          description,
          type: 'string'
        }
      }, handler),
      parent: C.group(description, {
        child: C(description, {
          number: {
            description,
            type: 'number'
          }
        }, handler)
      })
    };

    const cases: Array<string[]> = [
      ['roots', '--help'],
      ['root', '--help', '--string'],
      ['root', '--string', '--help'],
      ['parent', 'childs', '--help'],
      ['parents', 'child', '--help'],
      ['parent', 'child', '--help', '--number'],
      ['parent', 'child', '--help', '--number', 'one'],
      ['parent', 'child', '--number', '--help']
    ];

    cases.forEach((args) => {
      assert.equal(
        parseCommand(args, commands).type,
        'help',
        `Help not requested for args: ${args.join(' ')}`
      );
    });
  });
});
