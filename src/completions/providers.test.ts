import { assert, describe, it } from 'vitest';

import { createTestContext } from '../tests.js';
import { useProvider } from './providers.js';
import { listShells } from './shells.js';

describe('useProvider', () => {
  for (const shell of listShells()) {
    it(`creates a ${shell.name} provider`, () => {
      const provider = useProvider(shell.name, {
        commands: {},
        context: createTestContext()
      });

      assert.include(provider.buildScript().script, shell.signature);
    });
  }
});
