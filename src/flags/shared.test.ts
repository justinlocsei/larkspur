import { assert, describe, it } from 'vitest';

import { useSharedFlags } from './shared.js';

describe('useSharedFlags', () => {
  it('returns the global flags', () => {
    assert.deepEqual(Object.keys(useSharedFlags()), ['help']);
  });
});
