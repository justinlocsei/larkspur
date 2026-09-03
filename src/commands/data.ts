import type { CommandTree } from './types.js';

/**
 * Filter hidden handlers from a tree
 */
export function visibleCommands(tree: CommandTree): CommandTree {
  return Object.fromEntries(
    Object.entries(tree).filter(([, command]) =>
      command && (command.type === 'group' || !command.hidden)
    )
  );
}
