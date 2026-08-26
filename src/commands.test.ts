import { assert, describe, it } from 'vitest';

import type { CommandTree } from './commands.js';
import { defineCommand, extractCommands, parse } from './commands.js';
import { OperationalError } from './errors.js';
import { extractValues } from './flags/parsing.js';
import type { Flag, SupportedValue } from './flags/types.js';
import * as T from './tests/types.js';
import { checkConversionAsync, ensure } from './tests.js';
import type { DistributiveOmit } from './types/utils.js';
import { transformValues } from './utils.js';

const description = 'description';
const handler = async () => {};

describe('defineCommand', () => {
  it('can define a command handler', () => {
    const command = defineCommand({ description, handler });

    assert.equal(command.description, description);
    assert.isFunction(command.handler);
  });

  it('can define a command group', () => {
    const group = defineCommand({
      description,
      subcommands: {
        child: defineCommand({
          description: 'Child',
          handler
        })
      }
    });

    assert.equal(group.description, description);
    assert.isDefined(group.subcommands);

    const { subcommands } = group;

    assert.isDefined(subcommands.child);
    assert.equal(subcommands.child.description, 'Child');
    assert.isFunction(subcommands.child.handler);
  });

  it('defines handlers that can access typed flags', () => {
    defineCommand({
      description,
      flags: {
        boolean: {
          description,
          type: 'boolean'
        },
        number: {
          description,
          type: 'number'
        },
        path: {
          description,
          type: 'path'
        },
        string: {
          description,
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              boolean: boolean;
              number?: number;
              path?: string;
              string?: string;
            }
          >
        >(true);
      }
    });
  });

  it('guarantees the presence of values for flags with defaults', () => {
    defineCommand({
      description,
      flags: {
        boolean: {
          default: true,
          description,
          type: 'boolean'
        },
        number: {
          default: 1,
          description,
          type: 'number'
        },
        onumber: {
          default: undefined,
          description,
          type: 'number'
        },
        ostring: {
          default: undefined,
          description,
          type: 'string'
        },
        string: {
          default: 'Value',
          description,
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              boolean: boolean;
              number: number;
              onumber?: number;
              ostring?: string;
              string: string;
            }
          >
        >(true);
      }
    });
  });

  it('guarantees the presence of required flags', () => {
    defineCommand({
      description,
      flags: {
        boolean: {
          description,
          type: 'boolean'
        },
        number: {
          description,
          required: true,
          type: 'number'
        },
        string: {
          description,
          required: true,
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              boolean: boolean;
              number: number;
              string: string;
            }
          >
        >(true);
      }
    });
  });

  it('supports specialized string flags using default values', () => {
    type Alfa = 'alfa' | 'ALFA';
    type Bravo = 'bravo' | 'BRAVO';

    const asType = <T>(value: T): T => value;

    const alfa = asType<Alfa>('alfa');
    const bravo = asType<Bravo>('BRAVO');

    defineCommand({
      description,
      flags: {
        alfa: {
          default: alfa,
          description,
          type: 'string'
        },
        bravo: {
          default: bravo,
          description,
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              alfa: Alfa;
              bravo: Bravo;
            }
          >
        >(true);
      }
    });
  });

  it('supports specialized string values using choice lists', () => {
    type Alfa = 'alfa' | 'ALFA';
    type Bravo = 'bravo' | 'BRAVO';

    const asList = <T>(value: T[]): T[] => value;

    const alfa = asList<Alfa>(['alfa']);
    const bravo = asList<Bravo>(['BRAVO']);

    const bravoDefault: Bravo = 'bravo';

    defineCommand({
      description,
      flags: {
        alfa: {
          choices: alfa,
          description,
          type: 'string'
        },
        bravo: {
          choices: bravo,
          default: bravoDefault,
          description,
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              alfa?: Alfa;
              bravo: Bravo;
            }
          >
        >(true);
      }
    });
  });

  it('supports specialized strings using validator functions', () => {
    type Alfa = 'alfa' | 'ALFA';
    type Bravo = 'bravo' | 'BRAVO';

    const asList = <T>(value: T[]): T[] => value;

    const alfa = asList<Alfa>(['alfa', 'ALFA']);
    const bravo = asList<Bravo>(['bravo', 'BRAVO']);

    defineCommand({
      description,
      flags: {
        alfa: {
          description,
          isValid: (v: string): v is Alfa => alfa.includes(v as Alfa),
          type: 'string'
        },
        bravo: {
          description,
          isValid: (v: string): v is Bravo => bravo.includes(v as Bravo),
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              alfa?: Alfa;
              bravo?: Bravo;
            }
          >
        >(true);
      }
    });
  });

  it('supports lists of values', () => {
    type Special = 'alfa' | 'bravo';

    const asType = <T>(value: T): T => value;
    const special = asType<Special>('alfa');

    defineCommand({
      description,
      flags: {
        numbers: {
          allowMany: true,
          description,
          type: 'number'
        },
        paths: {
          allowMany: true,
          description,
          type: 'path'
        },
        specials: {
          allowMany: true,
          default: special,
          description,
          type: 'string'
        },
        strings: {
          allowMany: true,
          description,
          required: true,
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              numbers?: number[];
              paths?: string[];
              specials: Special[];
              strings: string[];
            }
          >
        >(true);
      }
    });
  });
});

describe('extractCommands', () => {
  it('returns a single-element list when given a command handler', () => {
    const commands = extractCommands(
      defineCommand({
        description: 'testing',
        handler
      })
    );

    assert.equal(commands.length, 1);
    const command = commands[0];

    assert.isDefined(command);
    assert.deepEqual(command.path, []);
    assert.equal(command.command.description, 'testing');
  });

  it('returns all command handlers in a group', () => {
    const commands = defineCommand({
      description: 'root',
      subcommands: {
        alfa: defineCommand({ description: 'alfa', handler }),
        bravo: defineCommand({ description: 'bravo', handler }),
        charlie: defineCommand({
          description: 'charlie',
          subcommands: {
            delta: defineCommand({ description: 'delta', handler })
          }
        })
      }
    });

    assert.sameDeepMembers(
      extractCommands(commands).map(c => [
        c.command.description,
        c.path.join('.')
      ]),
      [
        ['alfa', 'alfa'],
        ['bravo', 'bravo'],
        ['delta', 'charlie.delta']
      ]
    );
  });
});

describe('parse', () => {
  it('extracts a command from args', () => {
    const result = parse(['testing'], {
      testing: defineCommand({ description, handler })
    });

    assert(result.type === 'command', 'Command not parsed');
    const { command, run } = result;

    assert.equal(command.command.description, description);
    assert.deepEqual(command.flags, {});
    assert.sameOrderedMembers(command.path, ['testing']);
    assert.isFunction(run);
  });

  it('extracts the requested command from args', () => {
    const commands = {
      alfa: defineCommand({
        description: 'alfa',
        handler
      }),
      bravo: defineCommand({
        description: 'bravo',
        handler
      })
    };

    const alfa = parse(['alfa'], commands);
    const bravo = parse(['bravo'], commands);

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
      alfa: defineCommand({
        description,
        subcommands: {
          bravo: defineCommand({
            description,
            handler
          }),
          charlie: defineCommand({
            description,
            subcommands: {
              delta: defineCommand({
                description,
                handler
              })
            }
          })
        }
      })
    };

    const shallow = parse(['alfa', 'bravo'], commands);
    const deep = parse(['alfa', 'charlie', 'delta'], commands);

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

  it('returns an error when no args are given', () => {
    const result = parse([], {
      alfa: defineCommand({ description, handler })
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
    const result = parse(['alfa'], {
      bravo: defineCommand({ description, handler })
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
    const result = parse(['alfa', 'bravo'], {
      alfa: defineCommand({
        description,
        subcommands: {
          bravo: defineCommand({
            description,
            subcommands: {
              charlie: defineCommand({
                description,
                handler
              })
            }
          })
        }
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
      const result = parse(args, commands);

      if (result.type === 'command') {
        return extractValues(result.command.flags);
      } else {
        assert.fail(`No flags parsed for args: ${args.join(' ')}`);
      }
    }

    const commands = {
      alfa: defineCommand({
        description,
        handler,
        flags: {
          'alfa-string': {
            description,
            type: 'string'
          }
        }
      }),
      bravo: defineCommand({
        description,
        handler,
        flags: {
          'bravo-string': {
            description,
            type: 'string'
          }
        }
      })
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

        const result = parse(['command', ...args], {
          command: {
            description,
            handler: async (parsed, { args }) => {
              values = parsed as Record<string, SupportedValue>;
              parsedArgs = args.parsed;
            },
            flags: transformValues(flags, flag => ({ ...flag, description }))
          }
        });

        assert(result.type === 'command', `Command not parsed: ${message}`);
        await result.run();

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
        parse(args, {
          command: {
            description,
            handler,
            flags: {
              valid: {
                description,
                type: 'string'
              }
            }
          }
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
      const result = parse(input, {
        command: {
          allowUnknownFlags: true,
          description,
          handler,
          flags: {
            boolean: { description, type: 'boolean' },
            string: { description, type: 'string' }
          }
        }
      });

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
    const result = parse(
      ['parent', 'command', '--string', 'value', '--other'],
      {
        parent: defineCommand({
          description,
          subcommands: {
            command: defineCommand({
              allowUnknownFlags: true,
              description,
              flags: {
                absent: { description, type: 'string' },
                string: { description, type: 'string' }
              },
              handler: async (_, parsing) => {
                assert.sameOrderedMembers(parsing.commandPath, [
                  'parent',
                  'command'
                ]);
              }
            })
          }
        })
      }
    );

    assert(result.type === 'command', 'Command not parsed');
    const run = await result.run();

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

  it('reports whether all supported flags were provided', async () => {
    const command = defineCommand({
      description,
      flags: {
        boolean: { default: false, description, type: 'boolean' },
        number: { default: 1, description, type: 'number' },
        path: { default: '/', description, type: 'path' },
        string: { default: '1', description, type: 'string' }
      },
      handler: async () => {}
    });

    await checkConversionAsync<string[], string[]>(
      async (flags, provided, message) => {
        const parsed = parse(['command', ...flags], { command });

        assert(parsed.type === 'command', `Command not parsed: ${message}`);
        const result = await parsed.run();

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
    defineCommand({
      description,
      flags: {
        alfa: { description, type: 'boolean' },
        bravo: { description, type: 'string' }
      },
      handler: async (_, details) => {
        T.assert<
          T.Equivalent<
            (typeof details)['providedFlags'],
            Set<'alfa' | 'bravo'>
          >
        >(true);
      }
    });
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
        parse(args, {
          parent: {
            description,
            subcommands: {
              child: {
                description,
                handler,
                flags: {
                  valid: {
                    description,
                    type: 'string'
                  }
                }
              }
            }
          }
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
    const parsed = parse(['command'], {
      command: defineCommand({
        description,
        handler: () => {
          throw new OperationalError('@error');
        }
      })
    });

    assert(parsed.type === 'command', 'Command not parsed');
    const result = await parsed.run();

    assert(result.type === 'failure', 'Command ran without errors');

    assert.instanceOf(result.error, OperationalError);
    assert.include(result.error.toString(), '@error');
  });

  it('throws an error when a handler throws a non-operational error', async () => {
    const parsed = parse(['command'], {
      command: defineCommand({
        description,
        handler: () => {
          throw new Error('@error');
        }
      })
    });

    assert(parsed.type === 'command', 'Command not parsed');
    await ensure.rejects(parsed.run, '@error');
  });

  it('can request help', () => {
    const result = parse(['--help'], {
      command: { description, handler }
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
    const result = parse(['command', '--help'], {
      command: {
        description: 'description',
        handler
      }
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
    const result = parse(['alfa', 'bravo', '--help'], {
      alfa: {
        description: 'alfa',
        subcommands: {
          bravo: {
            description: 'bravo',
            handler
          }
        }
      }
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
    const result = parse(['alfa', '--help'], {
      alfa: {
        description,
        subcommands: {
          bravo: { description, handler },
          charlie: { description, handler }
        }
      }
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
    const commands = {
      root: defineCommand({
        description,
        handler,
        flags: {
          string: {
            description,
            type: 'string'
          }
        }
      }),
      parent: defineCommand({
        description,
        subcommands: {
          child: defineCommand({
            description,
            handler,
            flags: {
              number: {
                description,
                type: 'number'
              }
            }
          })
        }
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
        parse(args, commands).type,
        'help',
        `Help not requested for args: ${args.join(' ')}`
      );
    });
  });

  it('includes core flags in all help requests', () => {
    const commands = {
      root: defineCommand({
        description,
        handler
      }),
      parent: defineCommand({
        description,
        subcommands: {
          child: defineCommand({
            description,
            handler
          })
        }
      })
    };

    const cases: Array<string[]> = [
      ['--help'],
      ['root', '--help'],
      ['parent', '--help'],
      ['parent', 'child', '--help']
    ];

    cases.forEach((args) => {
      const result = parse(args, commands);

      assert.sameMembers(
        result.type === 'help' ? Object.keys(result.scope.flags) : [],
        ['help'],
        `Core flags not present for args: ${args.join(' ')}`
      );
    });
  });
});
