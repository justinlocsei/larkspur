import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import type { EntryPointProvider } from './cli.js';
import { run } from './cli.js';
import type { EntryPoint } from './commands/types.js';
import C from './factory.js';

describe('run', () => {
  let executed = false;

  const entry: EntryPoint = {
    command: C('description', async () => {
      executed = true;
    })
  };

  beforeEach(() => {
    executed = false;
  });

  afterEach(() => {
    assert.isTrue(executed, 'command failed to run');
  });

  function checkCommand(provider: EntryPointProvider) {
    return run(provider, {
      args: ['command'],
      name: 'testing'
    });
  }

  it('accepts a static entry point', () => checkCommand(entry));

  it('accepts a synchronous entry-point provider', () =>
    checkCommand(() => entry));

  it('accepts an asynchronous entry-point provider', () =>
    checkCommand(async () => entry));
});
