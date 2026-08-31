import { assert, describe, it } from 'vitest';

import { createTestContext } from '../tests.js';
import type { CompletionSource } from './provider.js';
import { buildShellCompletions } from './shells.js';

const cli: CompletionSource = {
  commands: {},
  context: createTestContext()
};

describe('buildShellCompletions', () => {
  it('supports bash', () => {
    assert.include(buildShellCompletions('bash', cli), 'COMPREPLY');
  });
});
