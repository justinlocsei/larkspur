import { test } from '@fast-check/vitest';
import { assert } from 'vitest';

import { runCLI } from './runner.js';
import { argv, singleCommand } from './tests/properties.js';
import { createTestContext } from './tests.js';

test.prop([argv, singleCommand])(
  'CLI commands handle arbitrary input',
  async (args, command) => {
    await runCLI({
      args: args,
      context: createTestContext(),
      entry: command.tree
    });
  }
);

test.prop([singleCommand])(
  'known CLI commands are executed',
  async (command) => {
    const result = await runCLI({
      args: [command.name],
      context: createTestContext(),
      entry: command.tree
    });

    assert.equal(result.type, 'success');
  }
);
