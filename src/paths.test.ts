import { assert, describe, it } from 'vitest';

import { expandPath } from './paths.js';

import { homedir } from 'node:os';
import path from 'node:path';

describe('expandPath', () => {
  function checkPath(input: string[], output: string[]) {
    assert.equal(expandPath(...input), path.join(...output));
  }

  it('joins path components', () => {
    checkPath(['alfa', 'bravo'], ['alfa', 'bravo']);
  });

  it('normalizes relative path components', () => {
    checkPath(['alfa', 'bravo', '..', 'bravo', '.'], ['alfa', 'bravo']);
  });

  it('expands references to the home directory', () => {
    checkPath(['~', 'alfa'], [homedir(), 'alfa']);
  });

  it('preserves tildes that are not references to the home directory', () => {
    checkPath(['alfa', '~bravo'], ['alfa', '~bravo']);
  });
});
