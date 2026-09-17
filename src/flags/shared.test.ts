import { assert, describe, it } from 'vitest';

import { resolveConfig } from '../config.ts';
import { createTestContext } from '../tests.ts';
import {
  getReservedFlagNames,
  useSharedFlags,
  useSharedRootFlags
} from './shared.ts';

describe('getReservedFlagNames', () => {
  it('returns the names of flags that are reserved for internal use', () => {
    assert.deepEqual(getReservedFlagNames(resolveConfig()), ['help']);
  });
});

describe('useSharedFlags', () => {
  it('returns help at every command depth', () => {
    assert.deepEqual(
      Object.keys(useSharedFlags(resolveConfig())),
      ['help']
    );
  });
});

describe('useSharedRootFlags', () => {
  it('includes a version flag when a CLI defines a version', () => {
    assert.deepEqual(
      Object.keys(useSharedRootFlags(createTestContext({ version: '1.0.0' }))),
      ['help', 'version']
    );
  });

  it('does not include a version flag by default', () => {
    assert.deepEqual(
      Object.keys(useSharedRootFlags(createTestContext())),
      ['help']
    );
  });
});
