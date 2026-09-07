import { assert, describe, it } from 'vitest';

import { useSharedFlags } from './shared.ts';

describe('useSharedFlags', () => {
  it('returns the global flags', () => {
    assert.deepEqual(Object.keys(useSharedFlags()), ['help']);
  });
});
