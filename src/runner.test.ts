import { assert, describe, it } from 'vitest';

import { defineCommand } from './commands.js';
import { OperationalError } from './errors.js';
import type { Logger, LogLevel, RunRequest } from './runner.js';
import { runCLI } from './runner.js';
import { transformValues } from './utils.js';

const filename = import.meta.filename;

const description = 'description';
const handler = async () => {};

type LogOutput = Record<LogLevel, string>;

async function testCLI(options: Omit<RunRequest, 'meta'>): Promise<{
  error?: Error | undefined;
  output: LogOutput;
}> {
  let error: Error | undefined;

  const output: LogOutput = {
    error: '',
    info: ''
  };

  await runCLI({
    ...options,
    meta: { name: 'testing' },
    logging: transformValues(output, (_, l): Logger => m => {
      output[l] += `${m}\n`;
    }),
    onError: (cause) => {
      error = cause;
    }
  });

  return {
    error,
    output
  };
}

describe('runCLI', () => {
  it('runs the command specified by the CLI args', async () => {
    let value: string | undefined;

    const commands = {
      command: defineCommand({
        description,
        flags: {
          flag: {
            description,
            type: 'string'
          }
        },
        handler: async (flags) => {
          value = flags.flag;
        }
      })
    };

    const { error, output } = await testCLI({
      args: ['command', '--flag', 'testing'],
      commands
    });

    assert.isUndefined(error);
    assert.isEmpty(output.error);
    assert.isEmpty(output.info);

    assert.equal(value, 'testing');
  });

  it('can show help', async () => {
    const { error, output } = await testCLI({
      args: ['--help'],
      commands: { command: { description, handler } }
    });

    assert.isUndefined(error);
    assert.isEmpty(output.error);
    assert.include(output.info, 'Show help');
  });

  it('handles parsing errors', async () => {
    const { error, output } = await testCLI({
      args: ['invalid-command'],
      commands: { command: { description, handler } }
    });

    assert.instanceOf(error, OperationalError);
    assert.include(output.info, '--help');

    const errors = output.error;
    assert.include(errors, 'invalid-command');
    assert.notInclude(errors, filename);
  });

  it('handles errors in user-provided parsing code', async () => {
    const { error, output } = await testCLI({
      args: ['command', '--key', 'error'],
      commands: {
        command: defineCommand({
          description,
          handler,
          flags: {
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
          }
        })
      }
    });

    assert.isDefined(error);
    assert.isEmpty(output.info);

    const text = output.error;
    assert.include(text, '@parsing');
    assert.include(text, filename);
  });

  it('handles command failures', async () => {
    const { error, output } = await testCLI({
      args: ['command'],
      commands: {
        command: defineCommand({
          description,
          handler: async () => {
            throw new OperationalError('@handler');
          }
        })
      }
    });

    assert.instanceOf(error, OperationalError);
    assert.isEmpty(output.info);

    const text = output.error;
    assert.include(text, '@handler');
    assert.notInclude(text, filename);
  });

  it('handles command errors', async () => {
    const { error, output } = await testCLI({
      args: ['command'],
      commands: {
        command: defineCommand({
          description,
          handler: async () => {
            throw new Error('@handler');
          }
        })
      }
    });

    assert.isDefined(error);
    assert.isEmpty(output.info);

    const text = output.error;
    assert.include(text, '@handler');
    assert.include(text, filename);
  });
});
