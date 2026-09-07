import { assert, describe, it } from 'vitest';

import C from '../factory.ts';
import { checkConversion } from '../tests.ts';
import {
  choicesForFlag,
  flagToSetter,
  getFlagForms,
  isFlagSetter,
  isScalarFlag,
  isSimpleScalarFlag
} from './data.ts';
import type { Flag, FlagChoices } from './types.ts';

const description = 'description';

const boolean = C.flag('boolean', description);
const number = C.flag('number', description);
const path = C.flag('path', description);
const string = C.flag('string', description);
const choice = C.flag('choice', description, { choices: ['alfa'] });

describe('choicesForFlag', () => {
  it('extracts the list of choices from a choice flag', () => {
    checkConversion<Flag, FlagChoices>(
      (i, o, m) => assert.deepEqual(choicesForFlag(i), o, m),
      [
        [boolean, undefined],
        [number, undefined],
        [path, undefined],
        [string, undefined],
        [
          {
            choices: ['alfa', 'bravo'],
            description,
            type: 'choice'
          },
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
        [boolean, 'test'],
        [{ default: true, description, type: 'boolean' }, 'no-test'],
        [{ default: false, description, type: 'boolean' }, 'test'],
        [choice, 'test'],
        [string, 'test'],
        [number, 'test'],
        [path, 'test']
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
        [boolean, false],
        [string, true],
        [number, true],
        [path, true],
        [choice, true]
      ]
    );
  });
});

describe('isSimpleScalarFlag', () => {
  it('detects scalar flags', () => {
    checkConversion<Flag, boolean>(
      (i, o, m) => assert.equal(isSimpleScalarFlag(i), o, m),
      [
        [boolean, false],
        [string, true],
        [number, true],
        [path, true],
        [choice, false]
      ]
    );
  });
});
