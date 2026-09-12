import { assert, describe, it } from 'vitest';

import { resolveConfig } from './config.ts';

describe('resolveConfig', () => {
  it('returns defaults for an empty configuration', () => {
    assert.deepEqual(resolveConfig(), {
      completions: {
        enabled: true,
        group: 'completions'
      },
      explore: {
        command: 'explore',
        enabled: true
      },
      help: {
        indent: 2
      }
    });
  });

  it('merges partial configuration data with defaults', () => {
    assert.deepEqual(
      resolveConfig({
        completions: { enabled: false },
        explore: { command: 'document' },
        help: {
          indent: 4
        }
      }),
      {
        completions: {
          enabled: false,
          group: 'completions'
        },
        explore: {
          command: 'document',
          enabled: true
        },
        help: {
          indent: 4
        }
      }
    );
  });

  it('rejects invalid names for the explore command', () => {
    for (const name of ['Invalid', 'invalid_command']) {
      assert.throws(
        () => resolveConfig({ explore: { command: name } }),
        name
      );
    }
  });

  it('rejects invalid names for the completions group', () => {
    for (const name of ['Invalid', 'invalid_group']) {
      assert.throws(
        () => resolveConfig({ completions: { group: name } }),
        name
      );
    }
  });
});
