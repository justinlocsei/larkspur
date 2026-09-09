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
        indent: 2
      }
    });
  });

  it('merges partial configuration data with defaults', () => {
    assert.deepEqual(
      resolveConfig({
        completions: { enabled: false, group: 'completion' },
        help: { indent: 4 }
      }),
      {
        completions: {
          enabled: false,
          group: 'completion'
        },
        help: {
          indent: 4
        }
      }
    );
  });
});
