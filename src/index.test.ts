import { assert, describe, it } from 'vitest';

import type { ValuesOf } from './index.ts';
import C, { run } from './index.ts';
import { T } from './tests.ts';

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

describe('ValuesOf', () => {
  it('exposes narrow flag values', () => {
    const flags = C.flags({
      number: C.flag('number', 'A number', { repeatable: true }),
      string: C.flag('string', 'A string')
    });

    T.assert<
      T.Equivalent<
        {
          number: number[];
          string?: string;
        },
        ValuesOf<typeof flags>
      >
    >(true);
  });
});
