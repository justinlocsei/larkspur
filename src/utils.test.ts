import { assert, describe, it } from 'vitest';

import { T } from './tests.js';
import {
  compact,
  drain,
  isEmpty,
  sortEntries,
  transformValues
} from './utils.js';

describe('compact', () => {
  it('removes falsy values from an array', () => {
    assert.sameOrderedMembers(
      compact(['a', 1, 0, true, false, null, undefined, '']),
      ['a', 1, true]
    );
  });

  it('preserves an empty array', () => {
    assert.deepEqual(compact([]), []);
  });

  it('preserves the type of the input array', () => {
    const numbers = compact([1, null]);
    const strings = compact(['a', null]);
    const booleans = compact([true, false]);

    T.assert<T.Equivalent<typeof numbers, number[]>>(true);
    T.assert<T.Assignable<typeof strings, string[]>>(true);
    T.assert<T.Assignable<typeof booleans, boolean[]>>(true);
  });
});

describe('drain', () => {
  it('yields stack items from top to bottom', () => {
    const stack = ['a', 'b', 'c'];

    assert.deepEqual([...drain(stack)], ['c', 'b', 'a']);
    assert.deepEqual(stack, []);
  });

  it('yields items pushed during iteration', () => {
    const stack = ['root'];
    const visited: string[] = [];

    for (const item of drain(stack)) {
      visited.push(item);

      if (item === 'root') {
        stack.push('child');
      }
    }

    assert.deepEqual(visited, ['root', 'child']);
  });
});

describe('isEmpty', () => {
  it('reports whether an object lacks properties', () => {
    assert.equal(isEmpty({}), true);
    assert.equal(isEmpty({ a: 1 }), false);
  });
});

describe('sortEntries', () => {
  it('sorts the entries of an object by key', () => {
    assert.deepEqual(
      sortEntries({ b: 2, a: 1 }),
      [['a', 1], ['b', 2]]
    );
  });
});

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
