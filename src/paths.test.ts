import { assert, describe, it } from 'vitest';

import { expandPath } from './paths.ts';
import { checkConversion } from './tests.ts';

import { homedir } from 'node:os';
import path from 'node:path';

describe('expandPath', () => {
  function checkPaths(tests: Array<[string[], string[]]>) {
    checkConversion(
      (i, o, m) => assert.equal(expandPath(...i), path.join(...o), m),
      tests
    );
  }

  it('joins and normalizes path components', () => {
    checkPaths([
      [['alfa'], ['alfa']],
      [['alfa', 'bravo'], ['alfa', 'bravo']],
      [['alfa', 'bravo', '..', 'charlie', '.'], ['alfa', 'charlie']]
    ]);
  });

  it('expands references to the home directory', () => {
    checkPaths([
      [['~'], [homedir()]],
      [[`~${path.sep}`], [homedir()]],
      [['~', 'alfa'], [homedir(), 'alfa']],
      [['~', '~alfa'], [homedir(), '~alfa']],
      [['~user'], ['~user']],
      [['alfa', '~user'], ['alfa', '~user']]
    ]);
  });
});
