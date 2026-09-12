import { assert, describe, it } from 'vitest';

import type { EntryPoint } from '../commands/types.ts';
import C from '../factory.ts';
import { createTestContext, ensure } from '../tests.ts';
import { defineExploreCommand, withExploreCommand } from './commands.ts';

describe('defineExploreCommand', () => {
  it('returns a command handler', () => {
    assert.equal(defineExploreCommand().type, 'handler');
  });
});

describe('withExploreCommands', () => {
  it('adds the explore command to the entry point', () => {
    const original: EntryPoint = {};
    const updated = withExploreCommand(original, createTestContext());

    assert.isDefined(updated.explore);
    assert.equal(updated.explore.type, 'handler');
    assert.isEmpty(original);
  });

  it('preserves the entry point if exploration is disabled', () => {
    const entry = withExploreCommand(
      {},
      createTestContext({}, { explore: { enabled: false } })
    );

    assert.isEmpty(entry);
  });

  it('throws an error if the explore command already exists', () => {
    ensure.throws(
      () =>
        withExploreCommand(
          { discover: C('Existing command', () => {}) },
          createTestContext({}, { explore: { command: 'discover' } })
        ),
      'discover'
    );
  });
});
