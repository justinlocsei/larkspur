import { assert, describe, it } from 'vitest';

import { resolveConfig } from '../config.ts';
import {
  getExploreFlagName,
  getReservedFlagNames,
  useSharedFlags
} from './shared.ts';

describe('getExploreFlagName', () => {
  it('returns the configured explore flag name', () => {
    const original = getExploreFlagName(resolveConfig());

    const custom = getExploreFlagName(
      resolveConfig({ help: { explore: { flag: 'document' } } })
    );

    assert.equal(original, 'explore');
    assert.equal(custom, 'document');
  });

  it('returns undefined when disabled', () => {
    const config = resolveConfig({ help: { explore: { enabled: false } } });

    assert.isUndefined(getExploreFlagName(config));
  });
});

describe('getReservedFlagNames', () => {
  it('returns the names of flags that are reserved for internal use', () => {
    assert.deepEqual(getReservedFlagNames(resolveConfig()), [
      'explore',
      'help'
    ]);
  });

  it('respects a custom explore flag', () => {
    assert.deepEqual(
      getReservedFlagNames(
        resolveConfig({ help: { explore: { flag: 'document' } } })
      ),
      [
        'document',
        'help'
      ]
    );
  });

  it('respects a disabled explore flag', () => {
    assert.deepEqual(
      getReservedFlagNames(
        resolveConfig({ help: { explore: { enabled: false } } })
      ),
      ['help']
    );
  });
});

describe('useSharedFlags', () => {
  it('returns the global flags', () => {
    assert.deepEqual(
      Object.keys(useSharedFlags(resolveConfig())),
      ['help', 'explore']
    );
  });

  it('omits the explore flag when disabled', () => {
    const config = resolveConfig({ help: { explore: { enabled: false } } });

    assert.deepEqual(Object.keys(useSharedFlags(config)), ['help']);
  });

  it('uses the configured explore flag name', () => {
    const config = resolveConfig({ help: { explore: { flag: 'document' } } });

    assert.deepEqual(Object.keys(useSharedFlags(config)), ['help', 'document']);
  });
});
