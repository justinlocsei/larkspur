import type { Subset } from '../src/types/utils.ts';
import type { CommandOptions } from './helpers/commands.ts';
import { showOutput } from './helpers/commands.ts';

/**
 * Run a command from node_modules via npm exec
 */
export function run(
  npmBin: string,
  args: string[] = [],
  options: Subset<CommandOptions, 'env'> = {}
): void {
  showOutput('npm', ['exec', '--', npmBin, ...args], options);
}
