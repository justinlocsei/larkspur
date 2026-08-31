import { assert, describe, it } from 'vitest';

import { useSharedFlags } from './shared.js';

describe('useSharedFlags', () => {
  it('uses more flags in a root than a nested scope', () => {
    const root = useSharedFlags('root');
    const nested = useSharedFlags('nested');

    assert.deepInclude(root, nested);
    assert.notDeepInclude(nested, root);
  });
});
