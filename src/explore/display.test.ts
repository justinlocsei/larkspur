import { assert, describe, it } from 'vitest';

import type { CommandHandler } from '../commands/types.ts';
import C from '../factory.ts';
import { buildUsage } from '../help/usage.ts';
import { createTestContext } from '../tests.ts';
import { formatCommands } from './display.ts';

async function handler() {}

function buildUsageFor(command: CommandHandler, path: string[]) {
  return buildUsage({
    context: createTestContext({ name: 'test-cli' }),
    scope: { command, path, type: 'command' },
    sharedFlags: false,
    showRequiredFlags: true
  });
}

function checkFormat(
  command: CommandHandler,
  path: string[],
  lines: string[]
) {
  assert.equal(
    formatCommands([buildUsageFor(command, path)]),
    lines.join('\n')
  );
}

describe('formatCommands', () => {
  it('formats a command with a description', () => {
    checkFormat(C('@alfa', handler), ['alfa'], [
      '$ test-cli alfa',
      '',
      '    @alfa'
    ]);
  });

  it('formats required and optional flags with details', () => {
    checkFormat(
      C(
        '@run',
        {
          alfa: C.flag('string', '@alfa', { required: true }),
          bravo: C.flag('choice', '@bravo', {
            choices: ['one', 'two'],
            default: 'one'
          })
        },
        handler
      ),
      ['run'],
      [
        '$ test-cli run --alfa <string> [flags]',
        '',
        '    @run',
        '',
        '    --alfa <string>',
        '      @alfa',
        '      (Required)',
        '    --bravo <choice>',
        '      @bravo',
        '      (Choices: one, two)',
        '      (Default: one)'
      ]
    );
  });

  it('omits the flags placeholder when all flags are required', () => {
    checkFormat(
      C(
        '@run',
        {
          shell: C.flag('choice', '@shell', {
            choices: ['bash', 'zsh'],
            required: true
          })
        },
        handler
      ),
      ['run'],
      [
        '$ test-cli run --shell <choice>',
        '',
        '    @run',
        '',
        '    --shell <choice>',
        '      @shell',
        '      (Required)',
        '      (Choices: bash, zsh)'
      ]
    );
  });

  it('separates full-format commands with a blank line', () => {
    const usages = [
      buildUsageFor(C('@alfa', handler), ['alfa']),
      buildUsageFor(C('@bravo', handler), ['bravo'])
    ];

    assert.equal(
      formatCommands(usages),
      [
        '$ test-cli alfa',
        '',
        '    @alfa',
        '',
        '$ test-cli bravo',
        '',
        '    @bravo'
      ].join('\n')
    );
  });

  it('lists command names on separate lines', () => {
    const usages = [
      buildUsageFor(C('@alfa', handler), ['alfa']),
      buildUsageFor(C('@bravo', handler), ['bravo'])
    ];

    assert.equal(
      formatCommands(usages, 'names'),
      'test-cli alfa\ntest-cli bravo'
    );
  });
});
