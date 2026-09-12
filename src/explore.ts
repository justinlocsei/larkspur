import { visibleCommands } from './commands/data.ts';
import type { Command, CommandTree, HelpScope } from './commands/types.ts';
import { formatCommand } from './explore/display.ts';
import { buildUsage } from './help/usage.ts';
import type { Context } from './types.ts';
import { drain, sortEntries } from './utils.ts';

/**
 * A level of a command tree being explored
 */
type Frame = {
  command: Command;
  path: string[];
};

/**
 * Build a message describing a CLI's executable commands and flags
 */
export function buildExploreMessage({
  commands,
  context
}: {
  commands: CommandTree;
  context: Context;
}): string {
  return buildHandlerScopes(commands)
    .map(scope =>
      formatCommand(buildUsage({
        context,
        scope,
        sharedFlags: false,
        showRequiredFlags: true
      }))
    ).join('\n\n');
}

/**
 * Build help scopes for all command handlers in a tree
 */
function buildHandlerScopes(commands: CommandTree): HelpScope[] {
  const stack: Frame[] = [];
  const scopes: HelpScope[] = [];

  const push = (commands: CommandTree, path: string[]): void => {
    for (
      const [name, command] of sortEntries(visibleCommands(commands)).reverse()
    ) {
      if (command !== undefined) {
        stack.push({ command, path: [...path, name] });
      }
    }
  };

  push(commands, []);

  for (const { command, path } of drain(stack)) {
    if (command.type === 'group') {
      push(command.subcommands, path);
    } else {
      scopes.push({ command, path, type: 'command' });
    }
  }

  return scopes;
}
