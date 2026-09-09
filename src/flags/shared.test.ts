import { assert, describe, it } from 'vitest';

import { resolveConfig } from '../config.ts';
import { getExploreFlagName, useSharedFlags } from './shared.ts';

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
