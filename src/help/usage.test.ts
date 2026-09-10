import { assert, describe, it } from 'vitest';

import type { HelpScope } from '../commands/types.ts';
import C from '../factory.ts';
import { createTestContext } from '../tests.ts';
import type { UserConfig } from '../types/config.ts';
import type { Metadata } from '../types.ts';
import type { PrintableFlag, Usage } from './usage.ts';
import { buildUsage } from './usage.ts';

async function handler() {}

const helpFlag: PrintableFlag = {
  description: 'Show help',
  details: [],
  required: false,
  setter: '--help'
};

const exploreFlag: PrintableFlag = {
  description: 'Recursively list commands and flags',
  details: [],
  required: false,
  setter: '--explore'
};

function checkUsage(
  scope: HelpScope,
  expected: Usage,
  meta?: Partial<Metadata>,
  config: UserConfig = {}
) {
  assert.deepEqual(
    buildUsage({
      context: createTestContext(meta, {
        help: { explore: { enabled: false } },
        ...config
      }),
      scope
    }),
    expected
  );
}

describe('buildUsage', () => {
  it('builds usage for a CLI’s root commands', () => {
    checkUsage(
      {
        commands: {
          alfa: C('@alfa', handler),
          bravo: C('@bravo', handler)
        },
        type: 'root'
      },
      {
        commands: [
          { description: '@alfa', label: 'alfa' },
          { description: '@bravo', label: 'bravo' }
        ],
        flags: [helpFlag],
        title: 'testing <command> [flags]'
      }
    );
  });

  it('includes the explore flag in root usage', () => {
    checkUsage(
      {
        commands: { alfa: C('@alfa', handler) },
        type: 'root'
      },
      {
        commands: [{ description: '@alfa', label: 'alfa' }],
        flags: [exploreFlag, helpFlag],
        title: 'testing <command> [flags]'
      },
      {},
      { help: { explore: { enabled: true } } }
    );
  });

  it('can opt out of shared flags', () => {
    const usage = buildUsage({
      context: createTestContext(),
      scope: {
        commands: { alfa: C('@alfa', handler) },
        type: 'root'
      },
      sharedFlags: false
    });

    assert.deepEqual(usage.flags, []);
  });

  it('does not show hidden root handlers', () => {
    checkUsage(
      {
        commands: {
          hidden: C({ description: '@hidden', handler, hidden: true }),
          visible: C('@visible', handler)
        },
        type: 'root'
      },
      {
        commands: [{ description: '@visible', label: 'visible' }],
        flags: [helpFlag],
        title: 'testing <command> [flags]'
      }
    );
  });

  it('builds usage for a CLI’s root command handlers and groups', () => {
    checkUsage(
      {
        commands: {
          alfa: C('@alfa', handler),
          bravo: C.group('@bravo', {
            charlie: C('@charlie', handler)
          })
        },
        type: 'root'
      },
      {
        commands: [
          { description: '@alfa', label: 'alfa' },
          { description: '@bravo', label: 'bravo <command>' }
        ],
        flags: [helpFlag],
        title: 'testing <command> [flags]'
      }
    );
  });

  it('can include a description for the CLI', () => {
    checkUsage(
      {
        commands: {
          command: C('@command', handler)
        },
        type: 'root'
      },
      {
        commands: [{ description: '@command', label: 'command' }],
        details: '@description',
        flags: [helpFlag],
        title: 'testing <command> [flags]'
      },
      { description: '@description' }
    );
  });

  it('builds usage for a command group', () => {
    checkUsage(
      {
        group: C.group('@parent', {
          alfa: C('@alfa', handler),
          bravo: C('@bravo', handler)
        }),
        path: ['parent'],
        type: 'group'
      },
      {
        commands: [
          { description: '@alfa', label: 'alfa' },
          { description: '@bravo', label: 'bravo' }
        ],
        details: '@parent',
        flags: [helpFlag],
        title: 'testing parent <command> [flags]'
      }
    );
  });

  it('includes the explore flag in usage messages for command groups', () => {
    checkUsage(
      {
        group: C.group('@parent', {
          alfa: C('@alfa', handler),
          bravo: C('@bravo', handler)
        }),
        path: ['parent'],
        type: 'group'
      },
      {
        commands: [
          { description: '@alfa', label: 'alfa' },
          { description: '@bravo', label: 'bravo' }
        ],
        details: '@parent',
        flags: [exploreFlag, helpFlag],
        title: 'testing parent <command> [flags]'
      },
      {},
      { help: { explore: { enabled: true } } }
    );
  });

  it('does not show hidden handlers in a command group', () => {
    checkUsage(
      {
        group: C.group('@parent', {
          hidden: C({ description: '@hidden', handler, hidden: true }),
          visible: C('@visible', handler)
        }),
        path: ['parent'],
        type: 'group'
      },
      {
        commands: [{ description: '@visible', label: 'visible' }],
        details: '@parent',
        flags: [helpFlag],
        title: 'testing parent <command> [flags]'
      }
    );
  });

  it('builds usage for a top-level command', () => {
    checkUsage(
      {
        command: C('@command', handler),
        path: ['command'],
        type: 'command'
      },
      {
        commands: [],
        details: '@command',
        flags: [helpFlag],
        title: 'testing command [flags]'
      }
    );
  });

  it('does not show the explore flag for a command', () => {
    checkUsage(
      {
        command: C('@command', handler),
        path: ['command'],
        type: 'command'
      },
      {
        commands: [],
        details: '@command',
        flags: [helpFlag],
        title: 'testing command [flags]'
      },
      {},
      { help: { explore: { enabled: true } } }
    );
  });

  it('builds usage for a grouped command', () => {
    checkUsage(
      {
        command: C('@command', handler),
        path: ['parent', 'command'],
        type: 'command'
      },
      {
        commands: [],
        details: '@command',
        flags: [helpFlag],
        title: 'testing parent command [flags]'
      }
    );
  });

  it('builds a list of flags', () => {
    checkUsage(
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
      {
        commands: [],
        details: '@command',
        flags: [
          {
            description: '@alfa',
            details: [],
            required: false,
            setter: '--alfa'
          },
          {
            description: '@bravo',
            details: [],
            required: false,
            setter: '--bravo'
          },
          helpFlag
        ],
        title: 'testing command [flags]'
      }
    );
  });

  it('can show required flags in the usage message', () => {
    const usage = buildUsage({
      context: createTestContext(),
      scope: {
        command: C(
          '@command',
          {
            alfa: C.flag('string', '@alfa', { required: true }),
            bravo: C.flag('string', '@bravo')
          },
          handler
        ),
        path: ['command'],
        type: 'command'
      },
      showRequiredFlags: true,
      sharedFlags: false
    });

    assert.deepEqual(usage.title, 'testing command --alfa <string> [flags]');
  });

  it('omits the flags placeholder in titles when all flags are required', () => {
    const usage = buildUsage({
      context: createTestContext(),
      scope: {
        command: C(
          '@command',
          {
            alfa: C.flag('string', '@alfa', { required: true }),
            bravo: C.flag('string', '@bravo', { required: true })
          },
          handler
        ),
        path: ['command'],
        type: 'command'
      },
      showRequiredFlags: true,
      sharedFlags: false
    });

    assert.deepEqual(
      usage.title,
      'testing command --alfa <string> --bravo <string>'
    );
  });

  it('combines command and core flags', () => {
    checkUsage(
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
      {
        commands: [],
        details: '@command',
        flags: [
          {
            description: '@alfa',
            details: [],
            required: false,
            setter: '--alfa'
          },
          {
            description: '@bravo',
            details: [],
            required: false,
            setter: '--bravo'
          },
          helpFlag
        ],
        title: 'testing [flags]'
      }
    );
  });

  it('shows placeholders for scalar flags', () => {
    checkUsage(
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
      {
        commands: [],
        details: '@command',
        flags: [
          {
            description: '@alfa',
            details: [],
            required: false,
            setter: '--alfa <string>'
          },
          {
            description: '@bravo',
            details: [],
            required: false,
            setter: '--bravo <number>'
          },
          {
            description: '@charlie',
            details: [],
            required: false,
            setter: '--charlie <path>'
          },
          helpFlag
        ],
        title: 'testing [flags]'
      }
    );
  });

  it('shows placeholders for repeatable scalar flags', () => {
    checkUsage(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('string', '@alfa', { repeatable: true }),
            bravo: C.flag('number', '@bravo', { repeatable: true }),
            charlie: C.flag('path', '@charlie', { repeatable: true })
          },
          handler
        ),
        path: [],
        type: 'command'
      },
      {
        commands: [],
        details: '@command',
        flags: [
          {
            description: '@alfa',
            details: [],
            required: false,
            setter: '--alfa <string> ...'
          },
          {
            description: '@bravo',
            details: [],
            required: false,
            setter: '--bravo <number> ...'
          },
          {
            description: '@charlie',
            details: [],
            required: false,
            setter: '--charlie <path> ...'
          },
          helpFlag
        ],
        title: 'testing [flags]'
      }
    );
  });

  it('annotates required flags', () => {
    checkUsage(
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
      {
        commands: [],
        details: '@command',
        flags: [
          {
            description: '@alfa',
            details: [],
            required: true,
            setter: '--alfa <string>'
          },
          {
            description: '@bravo',
            details: [],
            required: true,
            setter: '--bravo <number>'
          },
          helpFlag
        ],
        title: 'testing command [flags]'
      }
    );
  });

  it('shows default values for flags', () => {
    checkUsage(
      {
        command: C(
          '@command',
          {
            alfa: C.flag('boolean', '@alfa', { default: false }),
            bravo: C.flag('boolean', '@bravo', { default: true }),
            charlie: C.flag('number', '@charlie', { default: 1 }),
            delta: C.flag('string', '@delta', { default: 'value' }),
            echo: C.flag('path', '@echo', { default: '/tmp' }),
            foxtrot: C.flag('string', '@foxtrot', {
              default: ['alfa', 'bravo'],
              repeatable: true
            })
          },
          handler
        ),
        path: [],
        type: 'command'
      },
      {
        commands: [],
        details: '@command',
        flags: [
          {
            description: '@alfa',
            details: [],
            required: false,
            setter: '--alfa'
          },
          {
            description: '@bravo',
            details: ['Default: true'],
            required: false,
            setter: '--[no-]bravo'
          },
          {
            description: '@charlie',
            details: ['Default: 1'],
            required: false,
            setter: '--charlie <number>'
          },
          {
            description: '@delta',
            details: ['Default: value'],
            required: false,
            setter: '--delta <string>'
          },
          {
            description: '@echo',
            details: ['Default: /tmp'],
            required: false,
            setter: '--echo <path>'
          },
          {
            description: '@foxtrot',
            details: ['Default: alfa, bravo'],
            required: false,
            setter: '--foxtrot <string> ...'
          },
          helpFlag
        ],
        title: 'testing [flags]'
      }
    );
  });

  it('shows choices for flags', () => {
    checkUsage(
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
      {
        commands: [],
        details: '@command',
        flags: [
          {
            description: '@alfa',
            details: ['Default: 1'],
            required: false,
            setter: '--alfa <number>'
          },
          {
            description: '@bravo',
            details: ['Choices: one, two', 'Default: one'],
            required: false,
            setter: '--bravo <choice>'
          },
          helpFlag
        ],
        title: 'testing [flags]'
      }
    );
  });
});
