import { assert, describe, it } from 'vitest';

import { listShells } from './completions/shells.ts';
import { OperationalError } from './errors.ts';
import C from './factory.ts';
import type { RunRequest } from './runner.ts';
import { runCLI } from './runner.ts';
import { createTestContext } from './tests.ts';

const description = 'description';
const handler = async () => {};

function testCLI(
  options: Omit<RunRequest, 'context'>,
  context = createTestContext()
) {
  return runCLI({
    ...options,
    context
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

  it('can explore the CLI', async () => {
    const response = await testCLI({
      args: ['--explore'],
      entry: { command: C(description, handler) }
    });

    assert(response.type === 'help', 'explore response not returned');
    assert.equal(response.message, '');
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

  it('captures a string returned by a command handler', async () => {
    const response = await testCLI({
      args: ['command'],
      entry: {
        command: C(description, async () => '@output')
      }
    });

    assert(response.type === 'success', 'command failed');
    assert.equal(response.output, '@output');
  });

  for (const shell of listShells()) {
    it(`injects completion commands for ${shell.name}`, async () => {
      const response = await testCLI({
        args: ['completions', 'generate', '--shell', shell.name],
        entry: {}
      });

      assert(response.type === 'success', 'completion command failed');
      assert.include(response.output, shell.signature);
    });
  }

  it('does not inject completion commands when disabled', async () => {
    const response = await testCLI(
      {
        args: ['completions'],
        entry: {}
      },
      createTestContext(
        {},
        { completions: { enabled: false } }
      )
    );

    assert(response.type === 'error', 'completion command was available');
    assert.include(response.error.message, 'Unknown command');
  });

  it('rejects invalid command trees before parsing', async () => {
    const response = await testCLI({
      args: ['command'],
      entry: {
        testing: C(
          description,
          { BadFlag: C.flag('string', description) },
          handler
        )
      }
    });

    assert(response.type === 'error', 'invalid tree was allowed');
    assert.instanceOf(response.error, OperationalError);

    assert.equal(
      response.error.message,
      'Invalid flag --BadFlag on command: testing'
    );
  });

  it('rejects names conflicts with completion commands', async () => {
    const response = await testCLI({
      args: [],
      entry: { completions: C(description, handler) }
    });

    assert(response.type === 'error', 'conflict');
    assert.instanceOf(response.error, OperationalError);
    assert.include(response.error.message, 'completions');
  });
});
