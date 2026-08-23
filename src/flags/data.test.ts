import { assert, describe, it } from 'vitest';

import { checkConversion, flag } from '../tests.js';
import {
  choicesForFlag,
  flagToSetter,
  getFlagForms,
  isFlagSetter,
  isScalarFlag
} from './data.js';
import type { Flag, FlagChoices } from './types.js';

const description = 'description';

describe('choicesForFlag', () => {
  it('extracts the list of choices from a string flag', () => {
    checkConversion<Flag, FlagChoices>(
      (i, o, m) => assert.deepEqual(choicesForFlag(i), o, m),
      [
        [flag('boolean'), undefined],
        [flag('number'), undefined],
        [flag('path'), undefined],
        [flag('string'), undefined],
        [
          { choices: ['alfa', 'bravo'], description, type: 'string' },
          ['alfa', 'bravo']
        ]
      ]
    );
  });
});

describe('flagToSetter', () => {
  it('converts flags to setters', () => {
    checkConversion<string, string>(
      (i, o, m) => assert.equal(flagToSetter(i), o, m),
      [
        ['alfa', '--alfa'],
        ['bravo', '--bravo']
      ]
    );
  });
});

describe('getFlagForms', () => {
  it('produces all of a flag’s forms', () => {
    checkConversion<Flag, string>(
      (i, o, m) => assert.sameMembers(getFlagForms('test', i), [o], m),
      [
        [flag('boolean'), 'test'],
        [{ default: true, description, type: 'boolean' }, 'no-test'],
        [{ default: false, description, type: 'boolean' }, 'test'],
        [flag('string'), 'test'],
        [flag('number'), 'test'],
        [flag('path'), 'test']
      ]
    );
  });
});

describe('isFlagSetter', () => {
  it('detects flag setters', () => {
    checkConversion<string, boolean>(
      (i, o, m) => assert.equal(isFlagSetter(i), o, m),
      [
        ['flag', false],
        ['-flag', false],
        ['--alfa', true],
        ['--bravo', true],
        ['--bravo-charlie', true],
        ['--alfa=1', true],
        ['test--flag', false],
        ['---alfa', false],
        ['--Alfa', false]
      ]
    );
  });
});

describe('isScalarFlag', () => {
  it('detects scalar flags', () => {
    checkConversion<Flag, boolean>(
      (i, o, m) => assert.equal(isScalarFlag(i), o, m),
      [
        [flag('boolean'), false],
        [flag('string'), true],
        [flag('number'), true],
        [flag('path'), true]
      ]
    );
  });
});
