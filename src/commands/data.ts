import type { Command, CommandTree } from './types.js';

/**
 * Get a named command from a tree
 *
 * This prevents native object properties from being treated as commands if a
 * user explicitly provides them as arguments.
 */
export function getCommand(
  tree: CommandTree,
  name: string
): Command | undefined {
  return Object.hasOwn(tree, name) ? tree[name] : undefined;
}

/**
 * A command tree with only visible commands
 */
export type VisibleCommands = Record<string, Command>;

/**
 * Filter hidden handlers from a tree
 */
export function visibleCommands(tree: CommandTree): VisibleCommands {
  return Object.fromEntries(
    Object.entries(tree).filter((entry): entry is [string, Command] => {
      const [, command] = entry;

      return command !== undefined
        && (command.type === 'group' || !command.hidden);
    })
  );
}
