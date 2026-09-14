import { assert, describe, it } from 'vitest';

import C, { run } from './index.ts';

describe('the public API', () => {
  it('includes command factories', () => {
    assert.isFunction(C);
    assert.isFunction(C.flag);
    assert.isFunction(C.group);
    assert.isFunction(C.tree);
  });

  it('includes the CLI runner', () => {
    assert.isFunction(run);
  });
});
