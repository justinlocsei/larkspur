import { assert, describe, it } from 'vitest';

import { OperationalError } from './errors.js';
import C from './factory.js';
import type { RunRequest } from './runner.js';
import { runCLI } from './runner.js';

const description = 'description';
const handler = async () => {};

function testCLI(options: Omit<RunRequest, 'meta'>) {
  return runCLI({
    ...options,
    meta: { name: 'testing' }
  });
}

describe('runCLI', () => {
  it('runs the command specified by the CLI args', async () => {
    let value: string | undefined;

    const commands = {
      command: C(description, {
        flag: {
          description,
          type: 'string'
        }
      }, async (flags) => {
        value = flags.flag;
      })
    };

    const response = await testCLI({
      args: ['command', '--flag', 'testing'],
      entry: commands
    });

    assert(response.type === 'success', 'command failed');
    assert.equal(value, 'testing');

    const { command } = response;

    assert.sameOrderedMembers(command.path, ['command']);
    assert.sameOrderedMembers(command.providedFlags, ['flag']);
  });

  it('can show help', async () => {
    const response = await testCLI({
      args: ['--help'],
      entry: { command: C(description, handler) }
    });

    assert(response.type === 'help', 'help not returned');
    assert.include(response.message, 'Show help');
  });

  it('handles parsing errors', async () => {
    const response = await testCLI({
      args: ['invalid-command'],
      entry: { command: C('@description', handler) }
    });

    assert(response.type === 'error', 'error not returned');
    const { error, help = '' } = response;

    assert.include(help, '--help');
    assert.include(help, '@description');

    assert.instanceOf(error, OperationalError);
    assert.equal(error.message, 'Unknown command: invalid-command');
  });

  it('handles errors in user-provided parsing code', async () => {
    const entry = {
      command: C(description, {
        key: {
          description: 'key',
          isValid: (value) => {
            if (value === 'error') {
              throw new Error('@parsing');
            } else {
              return true;
            }
          },
          type: 'string'
        }
      }, handler)
    };

    const success = await testCLI({
      args: ['command', '--key', 'valid'],
      entry
    });

    assert(success.type === 'success', 'valid key failed');

    const failure = await testCLI({
      args: ['command', '--key', 'error'],
      entry
    });

    assert(failure.type === 'error', 'error not returned');
    const { message } = failure.error;

    assert.include(message, 'Could not parse CLI arguments');
    assert.include(message, '@parsing');
  });

  it('handles command failures', async () => {
    const response = await testCLI({
      args: ['command'],
      entry: {
        command: C(description, async () => {
          throw new OperationalError('@handler');
        })
      }
    });

    assert(response.type === 'error', 'error not returned');
    const { error } = response;

    assert.instanceOf(error, OperationalError);
    assert.equal(error.message, '@handler');
    assert.isUndefined(response.help);
  });

  it('handles command errors', async () => {
    const response = await testCLI({
      args: ['command'],
      entry: {
        command: C(description, async () => {
          throw new Error('@handler');
        })
      }
    });

    assert(response.type === 'error', 'error not returned');
    const { error } = response;

    assert.include(error.message, '@handler');
    assert.isUndefined(response.help);
  });
});
