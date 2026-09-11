import { OperationalError } from '../src/errors.ts';
import type { EnvironmentVariables } from '../src/types.ts';

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

/**
 * Produce the path to a node_modules executable
 */
function localBin(name: string): string {
  return path.join(REPO_ROOT, 'node_modules', '.bin', name);
}

/**
 * Produce the path to a file relative to the repository root
 */
export function localFile(name: string): string {
  return path.join(REPO_ROOT, name);
}

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
