import { assert, describe, it } from 'vitest';

import type { CommandTree } from '../../commands/types.js';
import C from '../../factory.js';
import type { TestContext } from '../../tests/shells/bash.js';
import { testBashCompletions } from '../../tests/shells/bash.js';
import {
  checkConversionAsync,
  createTestContext,
  ensure,
  useTempDir
} from '../../tests.js';
import { BashCompletionProvider } from './bash.js';

import fs from 'node:fs/promises';

const description = '';
const handler = async () => {};
const command = C({ description, handler });

describe('BashCompletionProvider', () => {
  async function getCompletions(
    commands: CommandTree,
    inputs: string[],
    context?: TestContext
  ): Promise<string[]> {
    const completion = new BashCompletionProvider({
      commands,
      context: createTestContext({ name: 'testing' })
    }).buildScript();

    return testBashCompletions({
      cliName: 'testing',
      completion,
      context,
      inputs
    });
  }

  function checkCompletions(
    commands: CommandTree,
    cases: Array<[string[], string[]]>,
    check?: (actual: string[], expected: string[], message: string) => void,
    context?: TestContext
  ) {
    return checkConversionAsync<string[], string[]>(async (
      input,
      output,
      message
    ) => {
      (check || assert.sameOrderedMembers)(
        await getCompletions(commands, input, context),
        output,
        message
      );
    }, cases);
  }

  it('lists root commands', () =>
    checkCompletions(
      {
        'alfa-one': command,
        'alfa-two': command,
        'bravo-one': command
      },
      [
        [[' '], ['alfa-one', 'alfa-two', 'bravo-one']],
        [['al'], ['alfa-one', 'alfa-two']],
        [['br'], ['bravo-one']],
        [['ch'], []]
      ]
    ));

  it('does not list hidden handlers', () =>
    checkCompletions(
      {
        hidden: C({ description, handler, hidden: true }),
        visible: command
      },
      [
        [[' '], ['visible']],
        [['h'], []],
        [['v'], ['visible']]
      ]
    ));

  it('lists the commands and core flags in a namespace', () =>
    checkCompletions(
      {
        parent: C.group(description, {
          alfa: command,
          bravo: command
        }),
        root: command
      },
      [
        [
          ['parent', ' '],
          ['alfa', 'bravo']
        ],
        [['parent', 'al'], ['alfa']],
        [['parent', 'br'], ['bravo']],
        [['parent', '--'], ['--help']],
        [['parent', 'ch'], []]
      ]
    ));

  it('lists deeply nested commands', () =>
    checkCompletions(
      {
        alfa: C.group(description, {
          bravo: C.group(description, {
            'charlie-one': command,
            'charlie-two': command,
            'delta-one': command
          }),
          echo: command
        }),
        foxtrot: command
      },
      [
        [
          ['alfa', 'bravo', ' '],
          ['charlie-one', 'charlie-two', 'delta-one']
        ],
        [
          ['alfa', 'bravo', 'ch'],
          ['charlie-one', 'charlie-two']
        ],
        [['alfa', 'bravo', 'de'], ['delta-one']],
        [['alfa', 'bravo', 'ec'], []]
      ]
    ));

  it('supports deeply nested commands', () => {
    let commands: CommandTree = {};

    for (let i = 3000; i > 0; i--) {
      commands = { [`command-${i}`]: C.group(description, commands) };
    }

    const completion = new BashCompletionProvider({
      commands,
      context: createTestContext({ name: 'testing' })
    }).provideScript();

    assert.isArray(completion.script);
  });

  it('lists a command’s flags', () =>
    checkCompletions(
      {
        command: C({
          description,
          flags: {
            'alfa-one': { description, type: 'string' },
            'alfa-two': { description, type: 'string' },
            'bravo-one': { description, type: 'string' }
          },
          handler
        })
      },
      [
        [
          ['command', ' '],
          ['--alfa-one', '--alfa-two', '--bravo-one', '--help']
        ],
        [
          ['command', '--al'],
          ['--alfa-one', '--alfa-two']
        ],
        [['command', '--br'], ['--bravo-one']],
        [['command', '--ch'], []]
      ]
    ));

  it('lists the flags of namespaced commands', () =>
    checkCompletions(
      {
        parent: C.group(description, {
          alfa: C({
            description,
            handler,
            flags: {
              'for-alfa': {
                default: false,
                description: 'alfa',
                type: 'boolean'
              }
            }
          }),
          bravo: C({
            description,
            handler,
            flags: {
              'for-bravo': {
                default: false,
                description: 'bravo',
                type: 'boolean'
              }
            }
          })
        }),
        root: C({
          description,
          handler,
          flags: {
            'for-root': {
              default: false,
              description: 'root',
              type: 'boolean'
            }
          }
        })
      },
      [
        [
          ['root', ' '],
          ['--for-root', '--help']
        ],
        [
          ['parent', 'alfa', ' '],
          ['--for-alfa', '--help']
        ],
        [
          ['parent', 'bravo', ' '],
          ['--for-bravo', '--help']
        ]
      ]
    ));

  it('includes core flags in all commands', () =>
    checkCompletions({ command }, [
      [['command', ' '], ['--help']],
      [['command', '--he'], ['--help']],
      [['command', '--x'], []]
    ]));

  it('shows boolean flags that are the opposite of their default', () =>
    checkCompletions(
      {
        command: C({
          description,
          flags: {
            alfa: { default: true, description, type: 'boolean' },
            bravo: { default: false, description, type: 'boolean' }
          },
          handler
        })
      },
      [
        [
          ['command', ' '],
          ['--bravo', '--help', '--no-alfa']
        ],
        [['command', '--no'], ['--no-alfa']],
        [['command', '--br'], ['--bravo']],
        [['command', '--ch'], []]
      ]
    ));

  it('lists root flags', () =>
    checkCompletions({ command }, [
      [['--'], ['--help']]
    ]));

  it('lists choices for scalar flags', () =>
    checkCompletions(
      {
        command: C({
          description,
          flags: {
            closed: {
              choices: ['alfa-one', 'alfa-two', 'bravo-one'],
              description,
              type: 'choice'
            },
            open: { description, type: 'string' }
          },
          handler
        })
      },
      [
        [['command', '--cl'], ['--closed']],
        [
          ['command', '--closed', ' '],
          ['alfa-one', 'alfa-two', 'bravo-one']
        ],
        [
          ['command', '--closed', 'alfa'],
          ['alfa-one', 'alfa-two']
        ],
        [['command', '--closed', 'br'], ['bravo-one']]
      ]
    ));

  it('safely embeds choice values', () =>
    useTempDir(async (dirPath) => {
      const marker = `${dirPath}/pwned`;

      await checkCompletions(
        {
          command: C({
            description,
            flags: {
              closed: {
                choices: [
                  'safe',
                  `$(touch "${marker}")`,
                  `has'quote`
                ],
                description,
                type: 'choice'
              }
            },
            handler
          })
        },
        [
          [['command', '--closed', 'sa'], ['safe']],
          [['command', '--closed', 'has'], [`has'quote`]]
        ],
        undefined,
        { cwd: dirPath }
      );

      await ensure.rejects(() => fs.access(marker));
    }));

  it('lists nothing for unconstrained scalar values', () =>
    checkCompletions(
      {
        command: C({
          description,
          flags: {
            number: { description, type: 'number' },
            string: { description, type: 'string' }
          },
          handler
        })
      },
      [
        [['command', '--number', ' '], []],
        [['command', '--number', '1'], []],
        [['command', '--string', ' '], []],
        [['command', '--string', 'x'], []]
      ]
    ));

  it('lists options for scalars defined using an equals sign', () =>
    useTempDir(async dirPath =>
      checkCompletions(
        {
          command: C({
            description,
            flags: {
              closed: {
                choices: ['alfa', 'bravo'],
                description,
                type: 'choice'
              },
              open: { description, type: 'string' }
            },
            handler
          })
        },
        [
          [
            ['command', '--closed='],
            ['alfa', 'bravo']
          ],
          [['command', '--closed=a'], ['alfa']],
          [['command', '--open='], []]
        ],
        (i, o, m) => assert.sameMembers(i, o, m),
        { cwd: dirPath }
      )
    ));
});
