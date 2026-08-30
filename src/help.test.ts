import { assert, describe, it } from 'vitest';

import C from './factory.js';
import { buildHelp } from './help.js';
import type { CLIMetadata } from './types.js';

async function handler() {}

const cli: CLIMetadata = { name: 'testing' };

describe('buildHelp', () => {
  it('can show help for a CLI’s root commands', () => {
    const help = buildHelp({
      cli,
      scope: {
        commands: {
          alfa: C('@alfa', handler),
          bravo: C('@bravo', handler)
        },
        flags: {},
        type: 'root'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing <command> [flags]',
        '',
        'Commands:',
        '',
        '  alfa   @alfa',
        '  bravo  @bravo'
      ].join('\n')
    );
  });

  it('can show help for a CLI’s root commands', () => {
    const help = buildHelp({
      cli,
      scope: {
        commands: {
          alfa: C('@alfa', handler),
          bravo: C.group('@bravo', {
            charlie: C('@charlie', handler)
          })
        },
        flags: {},
        type: 'root'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing <command> [flags]',
        '',
        'Commands:',
        '',
        '  alfa             @alfa',
        '  bravo <command>  @bravo'
      ].join('\n')
    );
  });

  it('can include a description for the root help', () => {
    const help = buildHelp({
      cli: { description: '@description', name: 'testing' },
      scope: {
        commands: {
          command: C('@command', handler)
        },
        flags: {},
        type: 'root'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing <command> [flags]',
        '',
        '@description',
        '',
        'Commands:',
        '',
        '  command  @command'
      ].join('\n')
    );
  });

  it('can show help for a command group', () => {
    const help = buildHelp({
      cli,
      scope: {
        group: C.group('@parent', {
          alfa: C('@alfa', handler),
          bravo: C('@bravo', handler)
        }),
        flags: {},
        path: ['parent'],
        type: 'group'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing parent <command> [flags]',
        '',
        '@parent',
        '',
        'Commands:',
        '',
        '  alfa   @alfa',
        '  bravo  @bravo'
      ].join('\n')
    );
  });

  it('can show help for a top-level command', () => {
    const help = buildHelp({
      cli,
      scope: {
        command: C('@command', handler),
        flags: {},
        path: ['command'],
        type: 'command'
      }
    });

    assert.equal(help, ['Usage: testing command', '', '@command'].join('\n'));
  });

  it('can show help for a grouped command', () => {
    const help = buildHelp({
      cli,
      scope: {
        command: C('@command', handler),
        flags: {},
        path: ['parent', 'command'],
        type: 'command'
      }
    });

    assert.equal(
      help,
      ['Usage: testing parent command', '', '@command'].join('\n')
    );
  });

  it('can list flags', () => {
    const help = buildHelp({
      cli,
      scope: {
        commands: {
          command: C('@command', handler)
        },
        flags: {
          alfa: C.flag('boolean', '@alfa'),
          bravo: C.flag('boolean', '@bravo')
        },
        type: 'root'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing <command> [flags]',
        '',
        'Commands:',
        '',
        '  command  @command',
        '',
        'Flags:',
        '',
        '  --alfa   @alfa',
        '  --bravo  @bravo'
      ].join('\n')
    );
  });

  it('combines command and core flags', () => {
    const help = buildHelp({
      cli,
      scope: {
        command: C('@command', {
          bravo: C.flag('boolean', '@bravo')
        }, handler),
        flags: {
          alfa: C.flag('boolean', '@alfa')
        },
        path: [],
        type: 'command'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa   @alfa',
        '  --bravo  @bravo'
      ].join('\n')
    );
  });

  it('hides flags marked as hidden', () => {
    const help = buildHelp({
      cli,
      scope: {
        commands: {
          command: C('@command', handler)
        },
        flags: {
          secret: C.flag('boolean', '@secret', { hidden: true })
        },
        type: 'root'
      }
    });

    assert.notInclude(help, '--secret');
  });

  it('shows placeholders for scalar flags', () => {
    const help = buildHelp({
      cli,
      scope: {
        command: C('@command', handler),
        flags: {
          alfa: C.flag('string', '@alfa'),
          bravo: C.flag('number', '@bravo'),
          charlie: C.flag('path', '@charlie')
        },
        path: [],
        type: 'command'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa <string>   @alfa',
        '  --bravo <number>  @bravo',
        '  --charlie <path>  @charlie'
      ].join('\n')
    );
  });

  it('shows placeholders for multi-value scalar flags', () => {
    const help = buildHelp({
      cli,
      scope: {
        command: C('@command', handler),
        flags: {
          alfa: C.flag('string', '@alfa', { allowMany: true }),
          bravo: C.flag('number', '@bravo', { allowMany: true }),
          charlie: C.flag('path', '@charlie', { allowMany: true })
        },
        path: [],
        type: 'command'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing [flags]',
        '',
        '@command',
        '',
        'Flags:',
        '',
        '  --alfa <string> ...   @alfa',
        '  --bravo <number> ...  @bravo',
        '  --charlie <path> ...  @charlie'
      ].join('\n')
    );
  });

  it('shows required flags', () => {
    const help = buildHelp({
      cli,
      scope: {
        commands: {
          command: C('@command', handler)
        },
        flags: {
          alfa: C.flag('string', '@alfa', { required: true }),
          bravo: C.flag('number', '@bravo', { required: true })
        },
        type: 'root'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing <command> [flags]',
        '',
        'Commands:',
        '',
        '  command  @command',
        '',
        'Required Flags:',
        '',
        '  --alfa <string>   @alfa',
        '  --bravo <number>  @bravo'
      ].join('\n')
    );
  });

  it('shows required and optional flags', () => {
    const help = buildHelp({
      cli,
      scope: {
        commands: {
          command: C('@command', handler)
        },
        flags: {
          alfa: C.flag('string', '@alfa', { required: true }),
          bravo: C.flag('number', '@bravo')
        },
        type: 'root'
      }
    });

    assert.equal(
      help,
      [
        'Usage: testing <command> [flags]',
        '',
        'Commands:',
        '',
        '  command  @command',
        '',
        'Required Flags:',
        '',
        '  --alfa <string>  @alfa',
        '',
        'Optional Flags:',
        '',
        '  --bravo <number>  @bravo'
      ].join('\n')
    );
  });

  it('shows default values for flags', () => {
    const help = buildHelp({
      cli,
      scope: {
        command: C('@command', handler),
        flags: {
          alfa: C.flag('boolean', '@alfa', { default: false }),
          bravo: C.flag('boolean', '@bravo', { default: true }),
          charlie: C.flag('number', '@charlie', { default: 1 }),
          delta: C.flag('string', '@delta', { default: 'value' }),
          echo: C.flag('path', '@echo', { default: '/tmp' })
        },
        path: [],
        type: 'command'
      }
    });

    assert.equal(
      help,
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
        '                      (Default: /tmp)'
      ].join('\n')
    );
  });

  it('shows choices for flags', () => {
    const help = buildHelp({
      cli,
      scope: {
        command: C('@command', handler),
        flags: {
          alfa: C.flag('number', '@alfa', { default: 1 }),
          bravo: C.flag('choice', '@bravo', {
            choices: ['one', 'two'],
            default: 'one'
          })
        },
        path: [],
        type: 'command'
      }
    });

    assert.equal(
      help,
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
        '                    (Default: one)'
      ].join('\n')
    );
  });
});
