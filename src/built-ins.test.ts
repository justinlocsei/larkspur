import { assert, describe, it } from 'vitest';

import { withBuiltInCommands } from './built-ins.ts';
import type { EntryPoint } from './commands/types.ts';
import { createTestContext, ensure } from './tests.ts';

describe('withBuiltInCommands', () => {
  it('adds built-in commands to the entry point', () => {
    const original: EntryPoint = {};
    const updated = withBuiltInCommands(original, createTestContext());

    assert.isDefined(updated.explore);
    assert.equal(updated.explore.type, 'handler');
    assert.isDefined(updated.completions);
    assert.equal(updated.completions.type, 'group');
    assert.isEmpty(original);
  });

  it('can opt out of the explore command', () => {
    const entry = withBuiltInCommands(
      {},
      createTestContext({ explore: false })
    );

    assert.isUndefined(entry.explore);
    assert.isDefined(entry.completions);
  });

  it('can opt out of completion commands', () => {
    const entry = withBuiltInCommands(
      {},
      createTestContext({ completions: false })
    );

    assert.isDefined(entry.explore);
    assert.isUndefined(entry.completions);
  });

  it('preserves the entry point if no built-in commands are enabled', () => {
    const entry = withBuiltInCommands(
      {},
      createTestContext({ completions: false, explore: false })
    );

    assert.isEmpty(entry);
  });

  it('prevent overlapping built-in commands', () => {
    ensure.throws(() =>
      withBuiltInCommands(
        {},
        createTestContext({
          completions: { group: 'overlap' },
          explore: { command: 'overlap' }
        })
      ), 'conflict');
  });
});
