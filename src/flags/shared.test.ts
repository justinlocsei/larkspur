import { assert, describe, it } from 'vitest';

import { resolveConfig } from '../config.ts';
import { getReservedFlagNames, useSharedFlags } from './shared.ts';

describe('getReservedFlagNames', () => {
  it('returns the names of flags that are reserved for internal use', () => {
    assert.deepEqual(getReservedFlagNames(resolveConfig()), ['help']);
  });
});

describe('useSharedFlags', () => {
  it('returns the global flags', () => {
    assert.deepEqual(
      Object.keys(useSharedFlags(resolveConfig())),
      ['help']
    );
  });
});
