import { test } from '@fast-check/vitest';
import { assert } from 'vitest';

import type { RunRequest, RunResponse } from './runner.js';
import { runCLI } from './runner.js';
import { argv, entryPoint, singleCommand } from './tests/properties.js';
import { createTestContext, inspect } from './tests.js';

async function mustRun(
  type: RunResponse['type'],
  request: RunRequest
): Promise<void> {
  const result = await runCLI(request);

  assert(result.type === type, inspect(result));
}

test.prop([argv, singleCommand])(
  'CLI commands handle arbitrary input',
  async (args, command) => {
    await runCLI({
      args,
      context: createTestContext(),
      entry: command.tree
    });
  }
);

test.prop([singleCommand])(
  'known CLI commands are executed',
  async (command) => {
    await mustRun('success', {
      args: [command.name],
      context: createTestContext(),
      entry: command.tree
    });
  }
);

test.prop([entryPoint()])(
  'valid entry points are executed',
  async (entry) => {
    await mustRun('help', {
      args: ['--help'],
      context: createTestContext(),
      entry: entry.tree
    });
  }
);

test.prop([entryPoint({ flags: { required: false } })])(
  'all commands in an entry point are executed',
  async (entry) => {
    for (const path of entry.handlers) {
      await mustRun('success', {
        args: path,
        context: createTestContext(),
        entry: entry.tree
      });
    }
  }
);

test.prop([entryPoint()])(
  'all commands groups in an entry point are valid',
  async (entry) => {
    for (const path of entry.groups) {
      await mustRun('help', {
        args: [...path, '--help'],
        context: createTestContext(),
        entry: entry.tree
      });
    }
  }
);
