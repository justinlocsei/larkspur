import { assert, describe, it } from 'vitest';

import C from '../factory.ts';
import { T } from '../tests.ts';
import { useFlag, useFlags } from './definition.ts';
import type { BooleanFlag, Flags, NumberFlag, StringFlag } from './types.ts';

const description = 'description';

describe('useFlag', () => {
  it('returns the provided flag', () => {
    const flag: NumberFlag = {
      description,
      type: 'number'
    };

    assert.deepEqual(useFlag(flag), flag);
  });

  it('preserves the specific flag type', () => {
    const number = useFlag({ description, type: 'number' });
    const string = useFlag({ description, type: 'string' });

    T.assert<T.Equivalent<NumberFlag, typeof number>>(true);
    T.assert<T.Equivalent<StringFlag, typeof string>>(true);
  });

  it('rejects unknown flag options', () => {
    // @ts-expect-error Unknown flag options are not allowed
    useFlag({ allowMany: true, description, type: 'number' });
  });

  it('rejects false for repeatable', () => {
    // @ts-expect-error Repeatable flags must be set to true
    useFlag({ description, repeatable: false, type: 'number' });
  });
});

describe('useFlags', () => {
  it('returns the provided flags', () => {
    const flags: Flags = {
      number: C.flag('number', description),
      string: C.flag('string', description)
    };

    assert.deepEqual(useFlags(flags), flags);
  });

  it('preserves specific flag types', () => {
    const flags = useFlags({
      boolean: { description, type: 'boolean' },
      string: { description, type: 'string' }
    });

    T.assert<T.Equivalent<'boolean' | 'string', keyof typeof flags>>(true);
    T.assert<T.Equivalent<BooleanFlag, typeof flags.boolean>>(true);
    T.assert<T.Equivalent<StringFlag, typeof flags.string>>(true);
  });

  it('rejects unknown flag options', () => {
    // @ts-expect-error Unknown flag options are not allowed
    useFlags({ number: { allowMany: true, description, type: 'number' } });
  });

  it('rejects false for repeatable', () => {
    // @ts-expect-error Repeatable flags must be set to true
    useFlags({ number: { description, repeatable: false, type: 'number' } });
  });
});
