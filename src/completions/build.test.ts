import { assert, describe, it } from 'vitest';

import { createTestContext } from '../tests.ts';
import {
  buildInstallationInstructions,
  buildShellCompletions
} from './build.ts';
import type { CompletionSource } from './provider.ts';
import { listShells } from './shells.ts';

const cli: CompletionSource = {
  commands: {},
  context: createTestContext({ name: 'test-cli' })
};

describe('buildInstallationInstructions', () => {
  it('uses different instructions for each shell', () => {
    const messages = listShells().map(shell =>
      buildInstallationInstructions(shell.name, cli)
    );

    assert.isNotEmpty(messages);
    assert.equal(messages.length, new Set(messages).size);
  });
});

describe('buildShellCompletions', () => {
  for (const shell of listShells()) {
    it(`supports ${shell.name}`, () => {
      assert.include(buildShellCompletions(shell.name, cli), shell.signature);
    });
  }
});
