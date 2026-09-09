import { assert, describe, it } from 'vitest';

import C from '../factory.ts';
import { T } from '../tests.ts';
import { useFlag, useFlags } from './definition.ts';
import type { DefaultFor } from './types.ts';
import type { ValueOf, ValuesOf } from './values.ts';
import { isMultiValueDefault } from './values.ts';

const description = 'description';

describe('ValueOf', () => {
  it('reports the most inclusive value of all supported flags', () => {
    const flags = useFlags({
      boolean: { description, type: 'boolean' },
      number: { description, type: 'number' },
      path: { description, type: 'path' },
      string: { description, type: 'string' }
    });

    type F = typeof flags;

    T.assert<T.Equivalent<boolean, ValueOf<F['boolean']>>>(true);
    T.assert<T.Equivalent<number | number[], ValueOf<F['number']>>>(true);
    T.assert<T.Equivalent<string | string[], ValueOf<F['path']>>>(true);
    T.assert<T.Equivalent<string | string[], ValueOf<F['string']>>>(true);
  });

  it('can report a more specific value type for flags', () => {
    const flags = useFlags({
      boolean: { description, type: 'boolean' },
      number: { description, type: 'number' },
      path: { description, type: 'path' },
      string: { description, type: 'string' }
    });

    type F = typeof flags;

    T.assert<T.Equivalent<boolean, ValueOf<F['boolean'], 'narrow'>>>(true);
    T.assert<T.Equivalent<number, ValueOf<F['number'], 'narrow'>>>(true);
    T.assert<T.Equivalent<string, ValueOf<F['path'], 'narrow'>>>(true);
    T.assert<T.Equivalent<string, ValueOf<F['string'], 'narrow'>>>(true);
  });

  it('respects specific choices for choice flags', () => {
    const subject = useFlag({
      choices: ['alfa', 'bravo'] as const,
      description,
      type: 'choice'
    });

    T.assert<
      T.Equivalent<
        'alfa' | 'bravo',
        ValueOf<typeof subject, 'narrow'>
      >
    >(true);
  });

  it('does not narrow string flags from default values', () => {
    type Choice = 'alfa' | 'bravo';

    const subject = useFlag({
      default: ((): Choice => 'alfa')(),
      description,
      type: 'string'
    });

    T.assert<
      T.Equivalent<
        string,
        ValueOf<typeof subject, 'narrow'>
      >
    >(true);
  });

  it('does not narrow string flags from validators', () => {
    const subject = useFlag({
      description,
      isValid: (v: string) => v === 'alfa' || v === 'bravo',
      type: 'string'
    });

    T.assert<
      T.Equivalent<
        string,
        ValueOf<typeof subject, 'narrow'>
      >
    >(true);
  });
});

describe('ValuesOf', () => {
  it('produces a context-appropriate value type for a set of flags', () => {
    const flags = useFlags({
      boolean: { description, type: 'boolean' },
      number: { description, repeatable: true, type: 'number' },
      path: { description, type: 'path' },
      string: { description, type: 'string' }
    });

    T.assert<
      T.Equivalent<
        {
          boolean: boolean;
          number: number | number[];
          path?: string | string[];
          string?: string | string[];
        },
        ValuesOf<typeof flags, 'wide'>
      >
    >(true);

    T.assert<
      T.Equivalent<
        {
          boolean: boolean;
          number: number[];
          path?: string;
          string?: string;
        },
        ValuesOf<typeof flags, 'narrow'>
      >
    >(true);
  });

  it('marks fields with a guaranteed value as present', () => {
    const defaultValue = 'test';

    const flags = useFlags({
      boolean: { description, type: 'boolean' },
      number: {
        description,
        required: true,
        type: 'number'
      },
      path: { description, type: 'path' },
      string: { default: defaultValue, description, type: 'string' }
    });

    T.assert<
      T.Equivalent<
        {
          boolean: boolean;
          number: number | number[];
          path?: string | string[];
          string: string | string[];
        },
        ValuesOf<typeof flags, 'wide'>
      >
    >(true);

    T.assert<
      T.Equivalent<
        {
          boolean: boolean;
          number: number;
          path?: string;
          string: string;
        },
        ValuesOf<typeof flags, 'narrow'>
      >
    >(true);
  });

  it('marks array defaults as guaranteed repeatable values', () => {
    const flags = useFlags({
      numbers: C.flag('number', description, {
        default: [1, 2],
        repeatable: true
      }),
      choices: C.flag('choice', description, {
        choices: ['alfa', 'bravo'],
        default: ['alfa', 'bravo'],
        repeatable: true
      })
    });

    T.assert<
      T.Equivalent<
        {
          choices: Array<'alfa' | 'bravo'>;
          numbers: number[];
        },
        ValuesOf<typeof flags, 'narrow'>
      >
    >(true);
  });
});

describe('isMultiValueDefault', () => {
  it('returns true for array defaults', () => {
    assert.isTrue(isMultiValueDefault([1, 2]));
    assert.isTrue(isMultiValueDefault(['alfa', 'bravo']));
  });

  it('returns false for scalar defaults', () => {
    assert.isFalse(isMultiValueDefault(1));
    assert.isFalse(isMultiValueDefault('alfa'));
  });

  it('preserves the type of an array value', () => {
    const numbers: DefaultFor<number> = [1, 2];

    if (isMultiValueDefault(numbers)) {
      T.assert<T.Equivalent<typeof numbers, readonly number[]>>(true);
    }
  });
});
