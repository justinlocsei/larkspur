import { fc, test } from '@fast-check/vitest';
import { assert } from 'vitest';

import { description, entryPoint } from '../tests/properties.ts';
import { createTestContext } from '../tests.ts';
import { buildShellCompletions } from './build.ts';
import { SUPPORTED_SHELLS } from './shells.ts';

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
