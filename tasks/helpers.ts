import { OperationalError } from '../src/errors.ts';
import type { EnvironmentVariables } from '../src/types.ts';
import { localBin, REPO_ROOT } from './helpers/paths.ts';

import { spawnSync } from 'node:child_process';

/**
 * Run a command
 */
export function run(
  npmBin: string,
  args: string[] = [],
  { env = {} }: { env?: EnvironmentVariables } = {}
): void {
  const command = localBin(npmBin);

  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit'
  });

  const exec = [command, ...args].join(' ');

  if (result.error) {
    throw new OperationalError(
      `Failed to run command: ${exec}`,
      result.error
    );
  } else if (result.status !== 0) {
    throw new OperationalError(
      `${exec} exited with code ${result.status ?? 'unknown'}`
    );
  }
}
