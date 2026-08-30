import { describe, it } from 'vitest';

import { useFlag, useFlags } from '../flags.js';
import { T } from '../tests.js';
import type { ValueOf, ValuesOf } from './values.js';

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
      number: { allowMany: true, description, type: 'number' },
      path: { description, type: 'path' },
      string: { description, type: 'string' }
    });

    T.assert<
      T.Equivalent<
        {
          boolean: boolean;
          number?: number | number[];
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
          number?: number[];
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
});
