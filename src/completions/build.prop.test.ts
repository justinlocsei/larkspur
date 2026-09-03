import { fc, test } from '@fast-check/vitest';
import { assert } from 'vitest';

import { description, entryPoint } from '../tests/properties.js';
import { createTestContext } from '../tests.js';
import { buildShellCompletions } from './build.js';
import { SUPPORTED_SHELLS } from './shells.js';

for (const shell of SUPPORTED_SHELLS) {
  test.prop([fc.string(), description, entryPoint()])(
    `${shell} completion supports all entry points`,
    (name, description, entry) => {
      const text = buildShellCompletions(shell, {
        commands: entry.tree,
        context: createTestContext({ description, name })
      });

      assert.isNotEmpty(text);
    }
  );
}
