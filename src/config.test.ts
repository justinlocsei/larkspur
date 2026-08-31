import { assert, describe, it } from 'vitest';

import { resolveConfig } from './config.js';

describe('resolveConfig', () => {
  it('returns defaults for an empty configuration', () => {
    assert.deepEqual(resolveConfig(), {
      completion: {
        enabled: true
      },
      help: {
        formatting: {
          gutter: 2,
          indent: 2
        }
      }
    });
  });

  it('merges partial configuration data with defaults', () => {
    assert.deepEqual(
      resolveConfig({
        completion: { enabled: false },
        help: { formatting: { gutter: 4 } }
      }),
      {
        completion: {
          enabled: false
        },
        help: {
          formatting: {
            gutter: 4,
            indent: 2
          }
        }
      }
    );
  });
});
