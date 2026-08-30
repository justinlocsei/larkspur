import { assert, describe, it } from 'vitest';

import { useFlag, useFlags } from '../flags.js';
import { T } from '../tests.js';
import type { ApplicableValues, ValueOf, ValuesOf } from './values.js';
import { setFlagValues } from './values.js';

const description = 'description';

describe('ApplicableValues', () => {
  it('describes a type that provides flag values', () => {
    const flags = useFlags({
      number: {
        description,
        required: true,
        type: 'number'
      },
      string: {
        description,
        required: true,
        type: 'string'
      }
    });

    T.assert<
      T.Equivalent<
        ApplicableValues<typeof flags>,
        {
          number: number;
          string: string;
        }
      >
    >(true);
  });

  it('makes boolean and optional flags optional', () => {
    const flags = useFlags({
      boolean: { description, type: 'boolean' },
      optional: {
        description,
        type: 'number'
      },
      required: {
        description,
        required: true,
        type: 'string'
      }
    });

    T.assert<
      T.Equivalent<
        ApplicableValues<typeof flags>,
        {
          boolean?: boolean;
          optional?: number;
          required: string;
        }
      >
    >(true);
  });
});

describe('setFlagValues', () => {
  it('produces a list of CLI arguments that provide flag values', () => {
    const flags = useFlags({
      boolean: { description, type: 'boolean' },
      number: { description, type: 'number' },
      path: { description, type: 'path' },
      string: { description, type: 'string' }
    });

    assert.sameOrderedMembers(
      setFlagValues(flags)
        .full({
          boolean: true,
          number: 10,
          path: '/',
          string: 'value'
        })
        .list(),
      ['--boolean', '--number', '10', '--path', '/', '--string', 'value']
    );
  });

  it('supports the omission of optional flags', () => {
    const flags = useFlags({
      optional: { description, type: 'string' },
      required: {
        description,
        required: true,
        type: 'string'
      }
    });

    assert.sameOrderedMembers(
      setFlagValues(flags).full({ required: 'value' }).list(),
      ['--required', 'value']
    );
  });

  it('supports all forms of boolean flags', () => {
    const flags = useFlags({
      alfa: { description, type: 'boolean' },
      bravo: { description, type: 'boolean' }
    });

    assert.sameOrderedMembers(
      setFlagValues(flags)
        .full({
          alfa: true,
          bravo: false
        })
        .list(),
      ['--alfa', '--no-bravo']
    );
  });

  it('treats all boolean flags as optional', () => {
    const flags = useFlags({
      alfa: { description, type: 'boolean' },
      bravo: { default: true, description, type: 'boolean' },
      charlie: { default: false, description, type: 'boolean' }
    });

    const set = setFlagValues(flags);

    assert.sameOrderedMembers(set.full({}).list(), []);

    assert.sameOrderedMembers(
      set
        .full({
          alfa: true,
          bravo: false,
          charlie: true
        })
        .list(),
      ['--alfa', '--no-bravo', '--charlie']
    );
  });

  it('ignores flags with an explicit undefined value', () => {
    const flags = useFlags({
      missing: { description, type: 'string' },
      present: { description, type: 'string' }
    });

    assert.sameOrderedMembers(
      setFlagValues(flags)
        .full({
          missing: undefined,
          present: 'value'
        })
        .list(),
      ['--present', 'value']
    );
  });

  it('supports multiple values for flags that allow them', () => {
    const flags = useFlags({
      numbers: { allowMany: true, description, type: 'number' },
      paths: { allowMany: true, description, type: 'path' },
      strings: { allowMany: true, description, type: 'string' }
    });

    assert.sameOrderedMembers(
      setFlagValues(flags)
        .full({
          numbers: [1, 2],
          paths: ['/alfa', '/bravo'],
          strings: ['alfa', 'bravo']
        })
        .list(),
      [
        '--numbers',
        '1',
        '--numbers',
        '2',
        '--paths',
        '/alfa',
        '--paths',
        '/bravo',
        '--strings',
        'alfa',
        '--strings',
        'bravo'
      ]
    );
  });

  it('can project flags as a string', () => {
    const flags = useFlags({
      complex: { description, type: 'string' },
      simple: { description, type: 'string' }
    });

    const values = setFlagValues(flags).full({
      complex: 'complex',
      simple: 'simple value'
    });

    assert.sameOrderedMembers(values.list(), [
      '--complex',
      'complex',
      '--simple',
      'simple value'
    ]);

    assert.equal(
      values.string(),
      '--complex complex --simple "simple value"'
    );
  });

  it('can set partial values for flags', () => {
    const flags = useFlags({
      optional: { description, type: 'string' },
      required: {
        description,
        required: true,
        type: 'string'
      }
    });

    const set = setFlagValues(flags);

    assert.equal(
      set
        .full({
          optional: 'alfa',
          required: 'bravo'
        })
        .string(),
      '--optional alfa --required bravo'
    );

    assert.equal(
      set.partial({ optional: 'alfa' }).string(),
      '--optional alfa'
    );
  });
});

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
