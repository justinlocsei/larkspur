import type { EntryPoint } from './commands/types.ts';
import { withCompletionCommands } from './completions/commands.ts';
import { withExploreCommand } from './explore/commands.ts';
import type { Context } from './types.ts';

/**
 * Add built-in commands to an entry point
 */
export function withBuiltInCommands(
  entry: EntryPoint,
  context: Context
): EntryPoint {
  return withExploreCommand(
    withCompletionCommands(entry, context),
    context
  );
}
