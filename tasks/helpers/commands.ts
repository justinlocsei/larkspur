import { OperationalError } from '../../src/errors.ts';
import type { EnvironmentVariables } from '../../src/types.ts';

import type { SpawnSyncOptions, SpawnSyncReturns } from 'node:child_process';
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
  const result = spawnSync(command, args, {
    ...options,
    encoding: 'utf8'
  });

  const label = [command, ...args].join(' ');

  if (result.error) {
    throw new OperationalError(`Failed to run command: ${label}`, result.error);
  }

  if (result.status !== 0) {
    throw new OperationalError(
      `${label} exited with code ${result.status ?? 'unknown'}${
        result.stderr ? `\n${result.stderr}` : ''
      }`
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
  options: CommandOptions
): void {
  captureOutput(
    command,
    args,
    { ...options, stdio: 'inherit' }
  );
}
