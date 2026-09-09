import { assert, describe, it } from 'vitest';

import type {
  EntryPointProvider,
  InternalOptions,
  UserOptions
} from './cli.ts';
import { run } from './cli.ts';
import type { EntryPoint } from './commands/types.ts';
import { OperationalError } from './errors.ts';
import C from './factory.ts';
import { ensure, testLogging } from './tests.ts';

const filename = import.meta.filename;

async function testRun(
  entry: EntryPointProvider,
  args: string[],
  options: UserOptions = {},
  internal: InternalOptions = {}
) {
  let error: Error | undefined;
  const { getOutput, logging } = testLogging();

  await run(entry, options, {
    args: [process.execPath, ...args],
    logging,
    onError: cause => {
      error = cause;
    },
    ...internal
  });

  return { error, output: getOutput() };
}

describe('run', () => {
  it('accepts static and dynamic entry points', async () => {
    let executed: boolean;

    const entry: EntryPoint = {
      testing: C('description', async () => {
        executed = true;
      })
    };

    const cases: Array<[EntryPointProvider, string]> = [
      [entry, 'static'],
      [() => entry, 'dynamic'],
      [async () => entry, 'async dynamic']
    ];

    for (const [provider, label] of cases) {
      executed = false;

      await testRun(provider, ['test-cli', 'testing']);

      assert.isTrue(executed, `${label} provider failed to run`);
    }
  });

  it('parses command args', async () => {
    let message: string | undefined;

    await testRun(
      {
        echo: C(
          'description',
          { message: C.flag('string', 'description') },
          async (flags) => {
            message = flags.message;
          }
        )
      },
      ['test-cli', 'echo', '--message', '@test']
    );

    assert.equal(message, '@test');
  });

  it('can show help', async () => {
    const { output: { error, info } } = await testRun(
      { testing: C('description', async () => {}) },
      ['test-cli', '--help']
    );

    assert.isEmpty(error);
    assert.include(info, 'test-cli');
    assert.include(info, 'help');
  });

  it('can use a custom CLI name and description', async () => {
    const { output } = await testRun(
      { testing: C('description', async () => {}) },
      [process.execPath, 'file-name', '--help'],
      {
        description: '@description',
        name: 'custom-name'
      }
    );

    assert.include(output.info, 'custom-name');
    assert.include(output.info, '@description');
  });

  it('infers the CLI name from the received arguments', async () => {
    const { output } = await testRun(
      { testing: C('description', async () => {}) },
      ['/bin/cli-name.mjs', '--help']
    );

    assert.include(output.info, 'cli-name');
    assert.notInclude(output.info, 'cli-name.mjs');
  });

  it('throws an error if the CLI name cannot be inferred', async () => {
    const entry: EntryPoint = {
      testing: C('description', async () => {})
    };

    await ensure.rejects(() => testRun(entry, []), 'infer');

    const { error } = await testRun(entry, [], { name: 'custom' });

    assert.isDefined(
      error,
      'name override did not skip inferring the CLI name'
    );
  });

  it('shows operational errors with a help message', async () => {
    const { error, output } = await testRun(
      { testing: C('@description', async () => {}) },
      ['test-cli', 'missing-command']
    );

    assert.instanceOf(error, OperationalError);
    assert.include(output.error, 'missing-command');
    assert.notInclude(output.error, filename);
    assert.include(output.info, '--help');
    assert.include(output.info, '@description');
  });

  it('logs standard errors with a stack trace', async () => {
    const { error, output } = await testRun(
      {
        testing: C('description', async () => {
          throw new Error('@handler');
        })
      },
      ['test-cli', 'testing']
    );

    assert.isDefined(error);
    assert.notInstanceOf(error, OperationalError);
    assert.include(output.error, '@handler');
    assert.include(output.error, filename);
  });

  it('logs a string returned by a command handler', async () => {
    const { error, output } = await testRun(
      { echo: C('description', async () => '@output') },
      ['test-cli', 'echo']
    );

    assert.isUndefined(error);
    assert.equal(output.info.trim(), '@output');
  });

  it('does not log blank strings returned by a command handler', async () => {
    const { error, output } = await testRun(
      { silent: C('description', async () => '   ') },
      ['test-cli', 'silent']
    );

    assert.isUndefined(error);
    assert.isEmpty(output.info);
  });
});
