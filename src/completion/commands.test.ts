import { assert, describe, it } from 'vitest';

import type { ParsingResult } from '../commands/parsing.js';
import { parseCommand } from '../commands/parsing.js';
import type { EntryPoint } from '../commands/types.js';
import { createTestContext, ensure } from '../tests.js';
import {
  defineCompletionCommands,
  withCompletionCommands
} from './commands.js';

function runCompletionCommand(args: string[]): ParsingResult {
  return parseCommand(['completions', ...args], {
    completions: defineCompletionCommands()
  });
}

describe('defineCompletionCommands', () => {
  it('returns a command group', () => {
    const completions = defineCompletionCommands();

    assert(completions.type === 'group');
    assert.isNotEmpty(completions.subcommands);
  });

  describe('generate', () => {
    it('generates a completion script', async () => {
      const parsed = runCompletionCommand(['generate', '--shell', 'bash']);

      assert(parsed.type === 'command', 'command not parsed');
      const run = await parsed.run(createTestContext());

      assert(run.type === 'success', 'command failed');
      assert.include(run.output, 'COMPREPLY');
    });

    it('rejects unsupported shells', () => {
      const parsed = runCompletionCommand(['generate', '--shell', 'fish']);

      assert(parsed.type === 'error', 'invalid shell was allowed');
      assert.include(parsed.message, '--shell');
    });
  });

  describe('withCompletionCommands', () => {
    it('adds completion commands to the entry point', () => {
      const original: EntryPoint = {};

      const updated = withCompletionCommands(
        original,
        createTestContext({}, { completion: { group: 'completions' } })
      );

      assert.isDefined(updated.completions);
      assert.equal(updated.completions.type, 'group');

      assert.isEmpty(original);
    });

    it('preserves the entry point if completions are not enabled', () => {
      const entry = withCompletionCommands(
        {},
        createTestContext({}, { completion: { enabled: false } })
      );

      assert.isEmpty(entry);
    });

    it('throws an error if the completion group already exists', () => {
      ensure.throws(
        () =>
          withCompletionCommands(
            { testing: defineCompletionCommands() },
            createTestContext({}, { completion: { group: 'testing' } })
          ),
        'testing'
      );
    });
  });
});
