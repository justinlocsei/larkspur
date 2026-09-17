import { assert, describe, it } from 'vitest';

import { withBuiltInCommands } from './built-ins.ts';
import type { CommandTree } from './commands/types.ts';
import type { ExploreOptions } from './explore.ts';
import { buildExploreMessage } from './explore.ts';
import C from './factory.ts';
import { createTestContext, handler } from './tests.ts';

const nestedCommands = {
  alfa: C('@alfa', handler),
  bravo: C.group('@bravo', {
    charlie: C('@charlie', handler),
    delta: C('@delta', handler)
  })
};

function checkExplore(
  commands: CommandTree,
  lines: string[],
  {
    context = createTestContext({ name: 'test-cli' }),
    format,
    includeBuiltIns
  }: Partial<ExploreOptions> = {}
) {
  assert.equal(
    buildExploreMessage({
      commands,
      context,
      format,
      includeBuiltIns
    }),
    lines.join('\n')
  );
}

describe('buildExploreMessage', () => {
  it('explores nested handlers from the root', () => {
    checkExplore(
      nestedCommands,
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
        '      @alfa',
        '      (Required)',
        '    --bravo <string>',
        '      @bravo'
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
        '      @shell',
        '      (Required)',
        '      (Choices: bash, zsh)'
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
        '      @bravo',
        '      (Choices: one, two)',
        '      (Default: one)'
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

  it('supports a name-only format', () => {
    checkExplore(
      nestedCommands,
      [
        'test-cli alfa',
        'test-cli bravo charlie',
        'test-cli bravo delta'
      ],
      { format: 'names' }
    );
  });

  it('supports a summary format', () => {
    checkExplore(
      nestedCommands,
      [
        'test-cli alfa           # @alfa',
        'test-cli bravo charlie  # @charlie',
        'test-cli bravo delta    # @delta'
      ],
      { format: 'summary' }
    );
  });

  it('omits built-in commands by default', () => {
    const context = createTestContext({ name: 'test-cli' });

    checkExplore(
      withBuiltInCommands({ alfa: C('@alfa', handler) }, context),
      ['test-cli alfa  # @alfa'],
      { context, format: 'summary' }
    );
  });

  it('includes built-in commands when requested', () => {
    const context = createTestContext({ name: 'test-cli' });

    checkExplore(
      withBuiltInCommands({ alfa: C('@alfa', handler) }, context),
      [
        'test-cli alfa                                   # @alfa',
        'test-cli completions generate --shell <choice>  # Generate a completion script',
        'test-cli completions install --shell <choice>   # Show installation instructions',
        'test-cli explore [flags]                        # Explore the CLI'
      ],
      { context, format: 'summary', includeBuiltIns: true }
    );
  });

  it('does not remove user commands that share built-in names', () => {
    const context = createTestContext({
      completions: false,
      explore: { command: 'discover' },
      name: 'test-cli'
    });

    checkExplore(
      withBuiltInCommands(
        {
          alfa: C('@alfa', handler),
          completions: C('@completions', handler),
          explore: C('@explore', handler)
        },
        context
      ),
      [
        'test-cli alfa         # @alfa',
        'test-cli completions  # @completions',
        'test-cli explore      # @explore'
      ],
      { context, format: 'summary' }
    );
  });
});
