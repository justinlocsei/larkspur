import { assert, describe, it } from 'vitest';

import { resolveConfig } from './config.ts';

describe('resolveConfig', () => {
  it('returns defaults for an empty configuration', () => {
    assert.deepEqual(resolveConfig(), {
      completions: {
        enabled: true,
        group: 'completions'
      },
      help: {
        explore: {
          enabled: true,
          flag: 'explore'
        },
        indent: 2
      }
    });
  });

  it('merges partial configuration data with defaults', () => {
    assert.deepEqual(
      resolveConfig({
        completions: { enabled: false },
        help: {
          explore: { flag: 'document' },
          indent: 4
        }
      }),
      {
        completions: {
          enabled: false,
          group: 'completions'
        },
        help: {
          explore: {
            enabled: true,
            flag: 'document'
          },
          indent: 4
        }
      }
    );
  });

  it('rejects invalid explore-flag names', () => {
    for (const name of ['help', 'Invalid']) {
      assert.throws(
        () => resolveConfig({ help: { explore: { flag: name } } }),
        name
      );
    }
  });
});
