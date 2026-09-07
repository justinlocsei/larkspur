import { assert, describe, it } from 'vitest';

import { createTestContext } from '../tests.ts';
import { useProvider } from './providers.ts';
import { listShells } from './shells.ts';

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
