import { OperationalError } from '../../src/errors.ts';
import { quote } from '../../src/shells.ts';
import type { EnvironmentVariables } from '../../src/types.ts';
import { REPO_ROOT } from './paths.ts';

import type {
  SpawnSyncOptions,
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns
} from 'node:child_process';
import { spawnSync } from 'node:child_process';

/**
 * Options for running a command
 */
export type CommandOptions = {
  cwd?: string;
  env?: EnvironmentVariables;
};

/**
 * Run a command and capture its output
 */
export function captureOutput(
  command: string,
  args: string[],
  options: SpawnSyncOptions
): SpawnSyncReturns<string> {
  const spawnOptions: SpawnSyncOptionsWithStringEncoding = {
    ...options,
    cwd: options.cwd ?? REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...options.env }
  };

  const result = process.platform === 'win32'
    ? spawnSync(
      [command, ...args.map(quote)].join(' '),
      { ...spawnOptions, shell: 'bash' }
    )
    : spawnSync(command, args, spawnOptions);

  const label = [command, ...args].join(' ');

  if (result.error) {
    throw new OperationalError(`Failed to run command: ${label}`, result.error);
  }

  if (result.status !== 0) {
    const output = result
      .output
      .filter(Boolean)
      .join('\n');

    throw new OperationalError(
      `${label} exited with code ${result.status ?? 'unknown'}\n${output}`
    );
  }

  return result;
}

/**
 * Run a command and show its output
 */
export function showOutput(
  command: string,
  args: string[],
  options?: CommandOptions
): void {
  captureOutput(
    command,
    args,
    { ...options, stdio: 'inherit' }
  );
}
