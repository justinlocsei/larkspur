import { assert, describe, it } from 'vitest';

import { createTestContext } from '../tests.ts';
import { getReservedFlagNames, useSharedFlags } from './shared.ts';

describe('getReservedFlagNames', () => {
  it('returns the names of flags that are reserved for internal use', () => {
    assert.deepEqual(getReservedFlagNames(createTestContext()), ['help']);
  });
});

describe('useSharedFlags', () => {
  it('returns help for the global scope', () => {
    assert.deepEqual(
      Object.keys(useSharedFlags(createTestContext(), 'global')),
      ['help']
    );
  });

  it('includes a version flag at the root when a CLI defines a version', () => {
    assert.deepEqual(
      Object.keys(useSharedFlags(
        createTestContext({ version: '1.0.0' }),
        'root'
      )),
      ['help', 'version']
    );
  });

  it('does not include a version flag at the root by default', () => {
    assert.deepEqual(
      Object.keys(useSharedFlags(createTestContext(), 'root')),
      ['help']
    );
  });
});
