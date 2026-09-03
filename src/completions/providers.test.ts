import { assert, describe, it } from 'vitest';

import { createTestContext } from '../tests.js';
import { useProvider } from './providers.js';

describe('useProvider', () => {
  it('creates a bash provider', () => {
    const provider = useProvider('bash', {
      commands: {},
      context: createTestContext()
    });

    assert.include(provider.buildScript().script, 'COMPREPLY');
  });
});
