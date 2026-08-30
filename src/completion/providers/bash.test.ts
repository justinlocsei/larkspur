import { assert, describe, it } from 'vitest';

import type { CommandTree } from '../../commands/types.js';
import C from '../../factory.js';
import { checkConversionAsync, useTempDir, useTempFile } from '../../tests.js';
import { COMPLETION_SHELLS } from '../../types.js';
import { compact } from '../../utils.js';
import { formatScript } from '../script.js';
import { BashCompletionProvider } from './bash.js';

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';

const description = '';
const handler = async () => {};
const command = C({ description, handler });

type SpawnOptions = { cwd?: string };

describe('BashCompletionProvider', () => {
  async function getCompletions(
    commands: CommandTree,
    inputs: string[],
    spawnOptions?: SpawnOptions
  ): Promise<string[]> {
    const completion = new BashCompletionProvider({
      commands,
      name: 'testing'
    }).provideScript();

    const args = ['testing', ...inputs];

    return useTempFile(async (filePath) => {
      const harness = `
        ${formatScript(completion.script)}

        COMP_CWORD=${args.length - 1}
        COMP_LINE="${args.join(' ')}"
        COMP_WORDS=(${compact(args.map(a => a.trim())).join(' ')})
        ${args[args.length - 1] === ' ' ? 'COMP_WORDS+=("")' : ''}

        ${completion.entryPoint}

        echo "\${COMPREPLY[@]}"
      `;

      await fs.writeFile(filePath, harness);

      const { stdout, status } = spawnSync('bash', [filePath], {
        ...spawnOptions,
        stdio: 'pipe'
      });

      assert.equal(status, 0, `completions failed: ${inputs.join(' ')}`);

      return stdout
        .toString()
        .split(' ')
        .map(s => s.trim())
        .filter(Boolean);
    });
  }

  function checkCompletions(
    commands: CommandTree,
    cases: Array<[string[], string[]]>,
    check?: (actual: string[], expected: string[], message: string) => void,
    spawnOptions?: SpawnOptions
  ) {
    return checkConversionAsync<string[], string[]>(async (
      input,
      output,
      message
    ) => {
      (check || assert.sameOrderedMembers)(
        await getCompletions(commands, input, spawnOptions),
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
        [['parent', '--'], ['--complete', '--help']],
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
          ['--alfa-one', '--alfa-two', '--bravo-one', '--complete', '--help']
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
          ['--complete', '--for-root', '--help']
        ],
        [
          ['parent', 'alfa', ' '],
          ['--complete', '--for-alfa', '--help']
        ],
        [
          ['parent', 'bravo', ' '],
          ['--complete', '--for-bravo', '--help']
        ]
      ]
    ));

  it('includes core flags in all commands', () =>
    checkCompletions({ command }, [
      [['command', ' '], ['--complete', '--help']],
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
          ['--bravo', '--complete', '--help', '--no-alfa']
        ],
        [['command', '--no'], ['--no-alfa']],
        [['command', '--br'], ['--bravo']],
        [['command', '--ch'], []]
      ]
    ));

  it('lists supported shells for completions', () =>
    checkCompletions({ command }, [
      [['command', '--complete', ' '], [...COMPLETION_SHELLS]],
      [['command', '--complete', 'b'], ['bash']]
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

  it('lists choices for scalar flags that use a custom completion function', () =>
    checkCompletions(
      {
        command: C({
          description,
          flags: {
            closed: {
              completion: 'echo alfa-one && echo alfa-two && echo bravo-one',
              description,
              type: 'string'
            }
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
