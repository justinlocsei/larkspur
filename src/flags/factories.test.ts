import { assert, describe, it } from 'vitest';

import { ensure, T } from '../tests.js';
import { buildFlag } from './factories.js';
import type {
  BooleanFlag,
  ChoiceFlag,
  ChoicesFor,
  NumberFlag,
  PathFlag,
  StringFlag
} from './types.js';

const description = 'description';

describe('buildFlag', () => {
  it('supports flags with default options', () => {
    const boolean = buildFlag('boolean', description);
    const number = buildFlag('number', description);
    const path = buildFlag('path', description);
    const string = buildFlag('string', description);

    T.assert<T.Equivalent<typeof boolean, BooleanFlag>>(true);
    T.assert<T.Equivalent<typeof number, NumberFlag>>(true);
    T.assert<T.Equivalent<typeof path, PathFlag>>(true);
    T.assert<T.Equivalent<typeof string, StringFlag>>(true);
  });

  it('supports complex boolean flags', () => {
    const flag = buildFlag('boolean', description, {
      default: true
    });

    assert.deepEqual(flag, {
      default: true,
      description,
      type: 'boolean'
    });

    T.assert<T.Assignable<typeof flag, BooleanFlag>>(true);

    // @ts-expect-error Boolean flags cannot be required
    buildFlag('boolean', description, { required: true });
  });

  it('supports complex number flags', () => {
    const flag = buildFlag('number', description, {
      allowMany: true,
      default: 1,
      required: true
    });

    assert.deepEqual(flag, {
      allowMany: true,
      default: 1,
      description,
      required: true,
      type: 'number'
    });

    T.assert<T.Assignable<typeof flag, NumberFlag>>(true);

    // @ts-expect-error Extra options are not allowed
    buildFlag('number', description, { other: 'value' });
  });

  it('supports path flags', () => {
    const flag = buildFlag('path', description, {
      allowMany: true,
      default: '/tmp',
      required: true
    });

    assert.deepEqual(flag, {
      allowMany: true,
      default: '/tmp',
      description,
      required: true,
      type: 'path'
    });

    T.assert<T.Assignable<typeof flag, PathFlag>>(true);

    // @ts-expect-error Extra options are not allowed
    buildFlag('path', description, { other: 'value' });
  });

  it('supports string flags', () => {
    const flag = buildFlag('string', description, {
      allowMany: true,
      default: 'value',
      required: true
    });

    assert.deepEqual(flag, {
      allowMany: true,
      default: 'value',
      description,
      required: true,
      type: 'string'
    });

    T.assert<T.Assignable<typeof flag, StringFlag>>(true);

    // @ts-expect-error Extra options are not allowed
    buildFlag('string', description, { other: 'value' });
  });

  it('supports choice flags', () => {
    const flag = buildFlag('choice', description, {
      choices: ['alfa', 'bravo']
    });

    assert.deepEqual(flag, {
      choices: ['alfa', 'bravo'],
      description,
      type: 'choice'
    });

    T.assert<T.Assignable<typeof flag, ChoiceFlag>>(true);
    T.assert<T.Equivalent<ChoicesFor<typeof flag>, 'alfa' | 'bravo'>>(true);

    // @ts-expect-error Extra options are not allowed
    buildFlag('choice', description, { choices: ['alfa'], other: 'value' });
  });

  it('supports numeric choices', () => {
    const flag = buildFlag('choice', description, {
      choices: [1, 2]
    });

    assert.deepEqual(flag, {
      choices: [1, 2],
      description,
      type: 'choice'
    });

    T.assert<T.Assignable<typeof flag, ChoiceFlag>>(true);
    T.assert<T.Equivalent<ChoicesFor<typeof flag>, 1 | 2>>(true);

    // @ts-expect-error Extra options are not allowed
    buildFlag('choice', description, { choices: [1], other: 'value' });
  });

  it('constrains the default value for a choice field to its choices', () => {
    const number = buildFlag('choice', description, {
      choices: [1, 2],
      default: 1
    });

    assert.equal(number.default, 1);

    // @ts-expect-error Invalid numbers are not allowed
    buildFlag('choice', description, {
      choices: [1, 2],
      default: 3
    });

    const string = buildFlag('choice', description, {
      choices: ['alfa', 'bravo'],
      default: 'alfa'
    });

    assert.equal(string.default, 'alfa');

    // @ts-expect-error Invalid numbers are not allowed
    buildFlag('choice', description, {
      choices: ['alfa', 'bravo'],
      default: 'charlie'
    });
  });

  it('enforces choices', () => {
    ensure.throws(
      () => buildFlag('choice', description, { choices: [] }),
      'one choice'
    );
  });

  it('enforces homogeneous choices', () => {
    ensure.throws(
      () =>
        // @ts-expect-error Heterogeneous choices are not allowed
        buildFlag('choice', description, { choices: ['alfa', 1] }),
      'same type'
    );
  });
});
