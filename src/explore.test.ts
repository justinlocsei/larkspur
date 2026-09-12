import { assert, describe, it } from 'vitest';

import type { CommandTree } from './commands/types.ts';
import { buildExploreMessage } from './explore.ts';
import C from './factory.ts';
import { createTestContext } from './tests.ts';

async function handler() {}

function checkExplore(commands: CommandTree, lines: string[]) {
  assert.equal(
    buildExploreMessage({
      context: createTestContext({ name: 'test-cli' }),
      commands
    }),
    lines.join('\n')
  );
}

describe('buildExploreMessage', () => {
  it('explores nested handlers from the root', () => {
    checkExplore(
      {
        alfa: C('@alfa', handler),
        bravo: C.group('@bravo', {
          charlie: C('@charlie', handler),
          delta: C('@delta', handler)
        })
      },
      [
        '$ test-cli alfa',
        '',
        '    @alfa',
        '',
        '$ test-cli bravo charlie',
        '',
        '    @charlie',
        '',
        '$ test-cli bravo delta',
        '',
        '    @delta'
      ]
    );
  });

  it('includes required flags in the usage line', () => {
    checkExplore(
      {
        run: C(
          '@run',
          {
            alfa: C.flag('string', '@alfa', { required: true }),
            bravo: C.flag('string', '@bravo')
          },
          handler
        )
      },
      [
        '$ test-cli run --alfa <string> [flags]',
        '',
        '    @run',
        '',
        '    --alfa <string>',
        '        @alfa',
        '        (Required)',
        '    --bravo <string>',
        '        @bravo'
      ]
    );
  });

  it('omits the flags placeholder when all flags are required', () => {
    checkExplore(
      {
        run: C(
          '@run',
          {
            shell: C.flag('choice', '@shell', {
              choices: ['bash', 'zsh'],
              required: true
            })
          },
          handler
        )
      },
      [
        '$ test-cli run --shell <choice>',
        '',
        '    @run',
        '',
        '    --shell <choice>',
        '        @shell',
        '        (Required)',
        '        (Choices: bash, zsh)'
      ]
    );
  });

  it('shows flag details', () => {
    checkExplore(
      {
        run: C(
          '@run',
          {
            bravo: C.flag('choice', '@bravo', {
              choices: ['one', 'two'],
              default: 'one'
            })
          },
          handler
        )
      },
      [
        '$ test-cli run [flags]',
        '',
        '    @run',
        '',
        '    --bravo <choice>',
        '        @bravo',
        '        (Choices: one, two)',
        '        (Default: one)'
      ]
    );
  });

  it('omits shared flags', () => {
    const message = buildExploreMessage({
      context: createTestContext(),
      commands: {
        alfa: C('@alfa', handler),
        bravo: C(
          '@bravo',
          { flag: C.flag('string', '@flag') },
          handler
        )
      }
    });

    assert.notInclude(message, '--help');
  });
});
