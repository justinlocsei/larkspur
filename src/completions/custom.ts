import { getCommand } from '../commands/data.js';
import type { CommandHandler, CommandTree } from '../commands/types.js';
import { isSimpleScalarFlag } from '../flags/data.js';
import type { SimpleScalarFlag } from '../flags/types.js';
import type { Require } from '../types/utils.js';
import { formatCompletions } from './output.js';
import type { CompletionSource } from './provider.js';

/**
 * Encode a path to a command flag
 */
export function encodeFlagPath(
  commandPath: string[],
  flagName: string
): string {
  return [...commandPath, flagName].join(':');
}

/**
 * A decoded path to a command flag
 */
type DecodedFlagPath = {
  command: string[];
  flag: string;
};

/**
 * Decode a path to a command flag
 */
export function decodeFlagPath(
  path: string
): DecodedFlagPath | undefined {
  const command = path.split(':');
  const flag = command.pop();

  return flag && command.every(Boolean)
    ? { command, flag }
    : undefined;
}

/**
 * A flag with a user completion function
 */
type CompletionFlag = Require<SimpleScalarFlag, 'completion'>;

/**
 * A resolved flag with a user completion function
 */
export type ResolvedFlag = {
  command: CommandHandler;
  flag: CompletionFlag;
};

/**
 * Resolve a command handler from a path in a command tree
 */
function resolveCommand(
  tree: CommandTree,
  path: string[]
): CommandHandler | undefined {
  let commands = tree;

  for (const [index, name] of path.entries()) {
    const command = getCommand(commands, name);

    if (!command) {
      return undefined;
    }

    if (index < path.length - 1) {
      if (command.type !== 'group') {
        return undefined;
      }

      commands = command.subcommands;
    } else if (command.type === 'handler') {
      return command;
    }
  }

  return undefined;
}

/**
 * Resolve a user-provided completion flag in a command tree
 */
function resolveFlag(
  tree: CommandTree,
  decoded: DecodedFlagPath
): ResolvedFlag | undefined {
  const command = resolveCommand(tree, decoded.command);

  if (!command) {
    return undefined;
  }

  const flag = command.flags && Object.hasOwn(command.flags, decoded.flag)
    ? command.flags[decoded.flag]
    : undefined;

  return flag && isSimpleScalarFlag(flag) && flag.completion
    ? { command, flag: flag as CompletionFlag }
    : undefined;
}

/**
 * Invoke a user completion function and format its results
 */
export async function provideCompletions(
  source: CompletionSource,
  { current = '', flag }: {
    current?: string;
    flag: string;
  }
): Promise<string> {
  const decoded = decodeFlagPath(flag);
  const resolved = decoded && resolveFlag(source.commands, decoded);

  if (!resolved) {
    return '';
  }

  let completions: string[];

  try {
    completions = await resolved.flag.completion({ current });
  } catch {
    completions = [];
  }

  return formatCompletions(completions);
}
