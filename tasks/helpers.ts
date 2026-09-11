import type { Subset } from '../src/types/utils.ts';
import type { CommandOptions } from './helpers/commands.ts';
import { showOutput } from './helpers/commands.ts';
import { localBin, REPO_ROOT } from './helpers/paths.ts';

/**
 * Run a command
 */
export function run(
  npmBin: string,
  args: string[] = [],
  { env = {} }: Subset<CommandOptions, 'env'> = {}
): void {
  showOutput(localBin(npmBin), args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env }
  });
}
