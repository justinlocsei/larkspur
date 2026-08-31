import { assert, describe, it } from 'vitest';

import type { HelpScope } from './commands/parsing.js';
import C from './factory.js';
import { buildHelp } from './help.js';
import { createTestContext } from './tests.js';
import type { Metadata } from './types.js';

async function handler() {}

const rootFlags = [
  '',
  'Flags:',
  '',
  '  --help  Show help'
];

function checkHelp(
  scope: HelpScope,
  lines: string[],
  meta?: Partial<Metadata>
) {
  assert.equal(
    buildHelp({
      context: createTestContext(meta),
      scope
    }),
    lines.join('\n')
  );
}

describe('buildHelp', () => {
  it('can show help for a CLI’s root commands', () => {
    checkHelp(
      {
        commands: {
          alfa: C('@alfa', handler),
          bravo: C('@bravo', handler)
        },
        type: 'root'
      },
      [
        'Usage: testing <command> [flags]',
        '',
        'Commands:',
        '',
        '  alfa   @alfa',
        '  bravo  @bravo',
        ...rootFlags
      ]
    );
  });

  it('can show help for a CLI’s root commands', () => {
    checkHelp(
      {
        commands: {
          alfa: C('@alfa', handler),
          bravo: C.group('@bravo', {
            charlie: C('@charlie', handler)
          })
        },
        type: 'root'
      },
      [
        'Usage: testing <command> [flags]',
        '',
        'Commands:',
        '',
        '  alfa             @alfa',
        '  bravo <command>  @bravo',
        ...rootFlags
      ]
    );
  });

  it('can include a description for the root help', () => {
    checkHelp(
      {
        commands: {
          command: C('@command', handler)
        },
        type: 'root'
      },
      [
        'Usage: testing <command> [flags]',
        '',
        '@description',
        '',
        'Commands:',
        '',
        '  command  @command',
        ...rootFlags
      ],
      { description: '@description' }
    );
  });

  it('can show help for a command group', () => {
    checkHelp(
      {
        group: C.group('@parent', {
          alfa: C('@alfa', handler),
          bravo: C('@bravo', handler)
        }),
        path: ['parent'],
        type: 'group'
      },
      [
        'Usage: testing parent <command> [flags]',
        '',
        '@parent',
        '',
        'Commands:',
        '',
        '  alfa   @alfa',
        '  bravo  @bravo',
        '',
        'Flags:',
        '',
        '  --help  Show help'
      ]
    );
  });

  it('can show help for a top-level command', () => {
    checkHelp(
      {
        command: C('@command', handler),
        path: ['command'],
        type: 'command'
      },
      [
        'Usage: testing command [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --help  Show help'
      ]
    );
  });

  it('can show help for a grouped command', () => {
    checkHelp(
      {
        command: C('@command', handler),
        path: ['parent', 'command'],
        type: 'command'
      },
      [
        'Usage: testing parent command [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --help  Show help'
      ]
    );
  });

  it('can list flags', () => {
    checkHelp(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('boolean', '@alfa'),
            bravo: C.flag('boolean', '@bravo')
          },
          handler
        ),
        path: ['command'],
        type: 'command'
      },
      [
        'Usage: testing command [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa   @alfa',
        '  --bravo  @bravo',
        '  --help   Show help'
      ]
    );
  });

  it('combines command and core flags', () => {
    checkHelp(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('boolean', '@alfa'),
            bravo: C.flag('boolean', '@bravo')
          },
          handler
        ),
        path: [],
        type: 'command'
      },
      [
        'Usage: testing [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa   @alfa',
        '  --bravo  @bravo',
        '  --help   Show help'
      ]
    );
  });

  it('hides flags marked as hidden', () => {
    const help = buildHelp({
      context: createTestContext(),
      scope: {
        command: C(
          '@command',
          {
            secret: C.flag('boolean', '@secret', { hidden: true })
          },
          handler
        ),
        path: ['command'],
        type: 'command'
      }
    });

    assert.notInclude(help, '--secret');
  });

  it('shows placeholders for scalar flags', () => {
    checkHelp(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('string', '@alfa'),
            bravo: C.flag('number', '@bravo'),
            charlie: C.flag('path', '@charlie')
          },
          handler
        ),
        path: [],
        type: 'command'
      },
      [
        'Usage: testing [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa <string>   @alfa',
        '  --bravo <number>  @bravo',
        '  --charlie <path>  @charlie',
        '  --help            Show help'
      ]
    );
  });

  it('shows placeholders for multi-value scalar flags', () => {
    checkHelp(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('string', '@alfa', { allowMany: true }),
            bravo: C.flag('number', '@bravo', { allowMany: true }),
            charlie: C.flag('path', '@charlie', { allowMany: true })
          },
          handler
        ),
        path: [],
        type: 'command'
      },
      [
        'Usage: testing [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa <string> ...   @alfa',
        '  --bravo <number> ...  @bravo',
        '  --charlie <path> ...  @charlie',
        '  --help                Show help'
      ]
    );
  });

  it('shows required flags', () => {
    checkHelp(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('string', '@alfa', { required: true }),
            bravo: C.flag('number', '@bravo', { required: true })
          },
          handler
        ),
        path: ['command'],
        type: 'command'
      },
      [
        'Usage: testing command [flags]',
        '',
        '@command',
        '',
        'Required Flags:',
        '',
        '  --alfa <string>   @alfa',
        '  --bravo <number>  @bravo',
        '',
        'Optional Flags:',
        '',
        '  --help  Show help'
      ]
    );
  });

  it('shows required and optional flags', () => {
    checkHelp(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('string', '@alfa', { required: true }),
            bravo: C.flag('number', '@bravo')
          },
          handler
        ),
        path: ['command'],
        type: 'command'
      },
      [
        'Usage: testing command [flags]',
        '',
        '@command',
        '',
        'Required Flags:',
        '',
        '  --alfa <string>  @alfa',
        '',
        'Optional Flags:',
        '',
        '  --bravo <number>  @bravo',
        '  --help            Show help'
      ]
    );
  });

  it('shows default values for flags', () => {
    checkHelp(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('boolean', '@alfa', { default: false }),
            bravo: C.flag('boolean', '@bravo', { default: true }),
            charlie: C.flag('number', '@charlie', { default: 1 }),
            delta: C.flag('string', '@delta', { default: 'value' }),
            echo: C.flag('path', '@echo', { default: '/tmp' })
          },
          handler
        ),
        path: [],
        type: 'command'
      },
      [
        'Usage: testing [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa              @alfa',
        '  --[no-]bravo        @bravo',
        '                      (Default: true)',
        '  --charlie <number>  @charlie',
        '                      (Default: 1)',
        '  --delta <string>    @delta',
        '                      (Default: value)',
        '  --echo <path>       @echo',
        '                      (Default: /tmp)',
        '  --help              Show help'
      ]
    );
  });

  it('shows choices for flags', () => {
    checkHelp(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('number', '@alfa', { default: 1 }),
            bravo: C.flag('choice', '@bravo', {
              choices: ['one', 'two'],
              default: 'one'
            })
          },
          handler
        ),
        path: [],
        type: 'command'
      },
      [
        'Usage: testing [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa <number>   @alfa',
        '                    (Default: 1)',
        '  --bravo <choice>  @bravo',
        '                    (Choices: one, two)',
        '                    (Default: one)',
        '  --help            Show help'
      ]
    );
  });
});
