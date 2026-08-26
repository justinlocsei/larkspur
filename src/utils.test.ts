import { assert, describe, it } from 'vitest';

import * as T from './tests/types.js';
import { transformValues } from './utils.js';

describe('transformValues', () => {
  const input = {
    a: 'alfa',
    b: 'bravo'
  };

  it('uses a value transformer to derive one object from another', () => {
    assert.deepEqual(
      transformValues(input, v => v.toUpperCase()),
      { a: 'ALFA', b: 'BRAVO' }
    );
  });

  it('can use an object’s keys when producing transformed values', () => {
    assert.deepEqual(
      transformValues(input, (v, k) => k + v),
      { a: 'aalfa', b: 'bbravo' }
    );
  });

  it('respects the type of the transformed values', () => {
    const output = transformValues(input, v => v.length);

    type Input = typeof input;
    type Output = typeof output;

    T.assert<T.Equivalent<'a' | 'b', keyof Input>>(true);
    T.assert<T.Equivalent<'a' | 'b', keyof Output>>(true);

    T.assert<T.Equivalent<string, Input[keyof Input]>>(true);
    T.assert<T.Equivalent<number, Output[keyof Output]>>(true);
  });

  it('provides accurate type information to the transformer', () => {
    type Input = {
      alfa: string;
      bravo?: number;
    };

    const input: Input = { alfa: 'test' };

    transformValues(input, (value) => {
      T.assert<T.Equivalent<typeof value, string | number>>(true);
    });
  });

  it('excludes missing keys from the transformation', () => {
    type Input = {
      alfa: string;
      bravo?: number;
    };

    const missing: Input = { alfa: 'test' };
    const blank: Input = { alfa: 'test', bravo: undefined };
    const present: Input = { alfa: 'test', bravo: 1 };

    assert.deepEqual(
      transformValues(missing, v => v),
      { alfa: 'test' }
    );

    assert.deepEqual(
      transformValues(blank, v => v),
      { alfa: 'test' }
    );

    assert.deepEqual(
      transformValues(present, v => v),
      { alfa: 'test', bravo: 1 }
    );
  });
});
