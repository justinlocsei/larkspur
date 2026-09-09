import type { HelpScope } from './commands/parsing.ts';
import type { Context } from './types.ts';

/**
 * Explore a CLI's commands and flags
 */
export function exploreCLI({
  context: _context,
  scope: _scope
}: {
  context: Context;
  scope: HelpScope;
}): string {
  return '';
}
