import { assert, describe, it } from 'vitest';

import { createCLI } from './index.js';

describe('createCLI', () => {
  it('creates a CLI', () => {
    assert.doesNotThrow(() => createCLI());
  });
});
