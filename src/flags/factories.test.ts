import { assert, describe, it } from 'vitest';

import { buildCommandHandler } from '../commands/factories.ts';
import { ensure, T } from '../tests.ts';
import { buildFlag } from './factories.ts';
import type {
  BooleanFlag,
  ChoiceFlag,
  ChoicesFor,
  NumberFlag,
  PathFlag,
  StringFlag
} from './types.ts';

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

  it('supports default values for basic flags', () => {
    buildFlag('boolean', description, { default: true });
    buildFlag('number', description, { default: 1 });
    buildFlag('path', description, { default: '/tmp' });
    buildFlag('string', description, { default: 'value' });
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
      default: [1],
      repeatable: true,
      required: true
    });

    assert.deepEqual(flag, {
      default: [1],
      description,
      repeatable: true,
      required: true,
      type: 'number'
    });

    T.assert<T.Assignable<typeof flag, NumberFlag>>(true);

    // @ts-expect-error Scalar defaults require an array when repeatable is true
    buildFlag('number', description, { repeatable: true, default: 1 });

    // @ts-expect-error Repeatable flags must be set to true
    buildFlag('number', description, { repeatable: false });

    // @ts-expect-error Extra options are not allowed
    buildFlag('number', description, { other: 'value' });
  });

  it('supports array defaults for repeatable scalar flags', () => {
    const flag = buildFlag('number', description, {
      default: [1, 2],
      repeatable: true
    });

    assert.deepEqual(flag.default, [1, 2]);
    assert.isTrue(flag.repeatable);

    // @ts-expect-error Array defaults require repeatable
    buildFlag('number', description, { default: [1, 2] });
  });

  it('supports path flags', () => {
    const flag = buildFlag('path', description, {
      default: ['/tmp'],
      repeatable: true,
      required: true
    });

    assert.deepEqual(flag, {
      default: ['/tmp'],
      description,
      repeatable: true,
      required: true,
      type: 'path'
    });

    T.assert<T.Assignable<typeof flag, PathFlag>>(true);

    // @ts-expect-error Scalar defaults require an array when repeatable is true
    buildFlag('path', description, { repeatable: true, default: '/tmp' });

    // @ts-expect-error Extra options are not allowed
    buildFlag('path', description, { other: 'value' });
  });

  it('supports string flags', () => {
    const flag = buildFlag('string', description, {
      default: ['value'],
      repeatable: true,
      required: true
    });

    assert.deepEqual(flag, {
      default: ['value'],
      description,
      repeatable: true,
      required: true,
      type: 'string'
    });

    T.assert<T.Assignable<typeof flag, StringFlag>>(true);

    // @ts-expect-error Scalar defaults require an array when repeatable is true
    buildFlag('string', description, { repeatable: true, default: 'value' });

    // @ts-expect-error Extra options are not allowed
    buildFlag('string', description, { other: 'value' });
  });

  it('supports custom completions', () => {
    const completion = ({ current }: { current: string }) => [current];
    const flag = buildFlag('string', description, { completion });

    assert.equal(flag.completion, completion);
  });

  it('supports custom completions when nested in a command', () => {
    const command = buildCommandHandler(
      description,
      {
        value: buildFlag('string', description, {
          completion: ({ current }) => [current]
        })
      },
      async () => {}
    );

    assert.isDefined(command.flags?.value);
  });

  it('forbids custom completions on choice flags', () => {
    // @ts-expect-error Choice flags cannot be built with completions
    buildFlag('choice', description, {
      choices: ['alfa', 'bravo'],
      // @ts-expect-error Completion functions are forbidden
      completion: ({ current }) => [current]
    });
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

  it('supports array defaults constrained to choices', () => {
    const flag = buildFlag('choice', description, {
      choices: ['alfa', 'bravo'],
      default: ['alfa', 'bravo'],
      repeatable: true
    });

    assert.deepEqual(flag.default, ['alfa', 'bravo']);

    // @ts-expect-error Array defaults require repeatable
    buildFlag('choice', description, {
      choices: ['alfa', 'bravo'],
      default: ['alfa']
    });

    // @ts-expect-error Array defaults must contain valid choices
    buildFlag('choice', description, {
      choices: ['alfa', 'bravo'],
      default: ['charlie'],
      repeatable: true
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
