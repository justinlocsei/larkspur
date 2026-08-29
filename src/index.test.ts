import { assert, describe, it } from 'vitest';

import C, { run } from './index.js';

describe('the public API', () => {
  it('exposes command factories', () => {
    assert.isFunction(C);
    assert.isFunction(C.flag);
    assert.isFunction(C.group);
  });

  it('exposes the CLI runner', () => {
    assert.isFunction(run);
  });
});
