import type { Subset } from '../src/types/utils.ts';
import type { CommandOptions } from './helpers/commands.ts';
import { showOutput } from './helpers/commands.ts';
import { localBin } from './helpers/paths.ts';

/**
 * Run a command
 */
export function run(
  npmBin: string,
  args: string[] = [],
  options: Subset<CommandOptions, 'env'> = {}
): void {
  showOutput(localBin(npmBin), args, options);
}
