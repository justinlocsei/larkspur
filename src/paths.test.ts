import { assert, describe, it } from 'vitest';

import { expandPath } from './paths.js';

import { homedir } from 'node:os';
import path from 'node:path';

describe('expandPath', () => {
  it('joins path components', () => {
    assert.equal(expandPath('alfa', 'bravo'), path.join('alfa', 'bravo'));
  });

  it('normalizes relative path components', () => {
    assert.equal(
      expandPath('alfa', 'bravo', '..', 'bravo', '.'),
      path.join('alfa', 'bravo')
    );
  });

  it('expands references to the home directory', () => {
    assert.equal(expandPath('~', 'alfa'), path.join(homedir(), 'alfa'));
  });

  it('preserves tildes that are not references to the home directory', () => {
    assert.equal(expandPath('alfa', '~bravo'), path.join('alfa', '~bravo'));
  });
});
