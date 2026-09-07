import type { Command, CommandTree } from './types.ts';

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
 * Filter hidden handlers from a tree
 */
export function visibleCommands(tree: CommandTree): CommandTree {
  return Object.fromEntries(
    Object.entries(tree).filter(([_, command]) =>
      command !== undefined
      && (command.type === 'group' || !command.hidden)
    )
  );
}
