import { assert, describe, it } from 'vitest';

import { OperationalError } from '../errors.js';
import type { RunResponse } from '../runner.js';
import { runCLI } from '../runner.js';
import { createTestContext } from '../tests.js';
import { defineCompletionCommands } from './commands.js';

async function runCompletionCommand(
  args: string[]
): Promise<{ output: string | undefined; result: RunResponse }> {
  const result = await runCLI({
    args: ['completion', ...args],
    context: createTestContext(),
    entry: { completion: defineCompletionCommands() }
  });

  return {
    output: result.type === 'success' ? result.output : undefined,
    result
  };
}

describe('defineCompletionCommands', () => {
  it('returns a command group', () => {
    const commands = defineCompletionCommands();

    assert(commands.type === 'group');
    assert.isNotEmpty(commands.subcommands);
  });

  describe('generate', () => {
    it('generates a completion script', async () => {
      const { output, result } = await runCompletionCommand([
        'generate',
        '--shell',
        'bash'
      ]);

      assert(result.type === 'success', 'command failed');
      assert.include(output, 'COMPREPLY');
    });

    it('rejects unsupported shells', async () => {
      const { result } = await runCompletionCommand([
        'generate',
        '--shell',
        'fish'
      ]);

      assert(result.type === 'error', 'invalid shell was allowed');

      assert.instanceOf(result.error, OperationalError);
      assert.include(result.error.message, '--shell');
    });
  });
});
