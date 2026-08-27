import { assert, describe, it } from 'vitest';

import * as T from '../tests/types.js';
import { buildFlag } from './factories.js';
import type { FlagOfType } from './types.js';
import type { SpecificValueOf } from './values.js';

const description = 'description';

describe('buildFlag', () => {
  it('produces narrowly typed flags', () => {
    const boolean = buildFlag('boolean', description);
    const number = buildFlag('number', description);
    const path = buildFlag('path', description);
    const string = buildFlag('string', description);

    T.assert<T.Equivalent<typeof boolean, FlagOfType<'boolean'>>>(true);
    T.assert<T.Equivalent<typeof number, FlagOfType<'number'>>>(true);
    T.assert<T.Equivalent<typeof path, FlagOfType<'path'>>>(true);
    T.assert<T.Equivalent<typeof string, FlagOfType<'string'>>>(true);
  });

  it('supports boolean flags', () => {
    const flag = buildFlag('boolean', description, {
      default: true
    });

    assert.deepEqual(flag, {
      default: true,
      description,
      type: 'boolean'
    });
  });

  it('supports number flags', () => {
    const flag = buildFlag('number', description, {
      default: 1,
      required: true
    });

    assert.deepEqual(flag, {
      default: 1,
      description,
      required: true,
      type: 'number'
    });
  });

  it('supports path flags', () => {
    const flag = buildFlag('path', description, {
      allowMany: true,
      default: '/tmp'
    });

    assert.deepEqual(flag, {
      allowMany: true,
      default: '/tmp',
      description,
      type: 'path'
    });
  });

  it('supports string flags', () => {
    const flag = buildFlag('string', description, {
      choices: ['alfa', 'bravo']
    });

    assert.deepEqual(flag, {
      choices: ['alfa', 'bravo'],
      description,
      type: 'string'
    });
  });

  it('preserves specialized string types', () => {
    const flag = buildFlag('string', description, {
      choices: ['alfa', 'bravo'] as const
    });

    T.assert<
      T.Equivalent<'alfa' | 'bravo', SpecificValueOf<typeof flag>>
    >(true);
  });
});
