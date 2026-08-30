import { assert, describe, it } from 'vitest';

import type {
  BooleanFlag,
  Flags,
  NumberFlag,
  StringFlag
} from './flags/types.js';
import { useFlag, useFlags } from './flags.js';
import { flag, T } from './tests.js';

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

    T.assert<T.Equivalent<typeof number, typeof string>>(false);
    T.assert<T.Equivalent<NumberFlag, typeof number>>(true);
    T.assert<T.Equivalent<StringFlag, typeof string>>(true);
  });
});

describe('useFlags', () => {
  it('returns the provided flags', () => {
    const flags: Flags = {
      number: flag('number'),
      string: flag('string')
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
});
