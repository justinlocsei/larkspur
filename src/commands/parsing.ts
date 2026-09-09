import { NormalizedArgs } from '../args.ts';
import { resolveConfig } from '../config.ts';
import { OperationalError } from '../errors.ts';
import type { FlagParsing, ParsedFlags } from '../flags/parsing.ts';
import {
  extractValues,
  getSharedFlagValue,
  ParsingError,
  parseFlags
} from '../flags/parsing.ts';
import { getExploreFlagName, useSharedFlags } from '../flags/shared.ts';
import type { Flags } from '../flags/types.ts';
import type { ValuesOf } from '../flags/values.ts';
import type { Config } from '../types/config.ts';
import type { Variant } from '../types/utils.ts';
import type { Context } from '../types.ts';
import { getCommand } from './data.ts';
import type {
  CommandGroup,
  CommandHandler,
  CommandTree,
  TreeScope
} from './types.ts';

/**
 * An executable command extracted from CLI args
 */
export type ParsedCommand = {
  command: CommandHandler<Flags>;
  flags: ParsedFlags;
  path: string[];
  providedFlags: string[];
};

/**
 * A code used for a parsing error
 */
type ParsingErrorCode = 'invalid-command' | 'invalid-flag';

/**
 * The fields shared by all parsing results
 */
type IsParsingResult<T extends string, U> = U & {
  type: T;
};

/**
 * Define an outcome of running a command
 */
type IsRunResult<T extends string, U> = U & {
  type: T;
};

/**
 * A failure when running a command
 */
type FailureRunResult = IsRunResult<'failure', {
  error: OperationalError;
}>;

/**
 * The result of a successful command run
 */
type SuccessRunResult = IsRunResult<'success', {
  command: ParsedCommand;
  output?: string;
}>;

/**
 * The result of running a command
 */
export type RunResult = FailureRunResult | SuccessRunResult;

/**
 * A function that runs a command
 */
type CommandRunner = (context: Context) => Promise<RunResult>;

/**
 * The successful extraction of a command from CLI args
 */
type CommandParsingResult = IsParsingResult<'command', {
  command: ParsedCommand;
}>;

/**
 * An error that occurred during parsing
 */
type ErrorParsingResult = IsParsingResult<'error', {
  code: ParsingErrorCode;
  help?: HelpScope;
  message: string;
}>;

/**
 * A request for help
 */
type HelpParsingResult = IsParsingResult<'help', {
  scope: HelpScope;
}>;

/**
 * A request to explore the CLI
 */
type ExploreParsingResult = IsParsingResult<'explore', {
  scope: ExploreScope;
}>;

/**
 * The results of parsing CLI args
 */
export type ParsingResult =
  | CommandParsingResult & { run: CommandRunner }
  | ErrorParsingResult
  | ExploreParsingResult
  | HelpParsingResult;

/**
 * An internal parsing result
 */
type InternalParsingResult =
  | CommandParsingResult
  | ErrorParsingResult
  | ExploreParsingResult
  | HelpParsingResult;

/**
 * The fields shared by all help scopes
 */
type IsHelpScope<T extends TreeScope, U> = U & {
  type: T;
};

/**
 * All possible scopes for showing help
 */
export type HelpScope =
  | IsHelpScope<'command', { command: CommandHandler; path: string[] }>
  | IsHelpScope<'group', { group: CommandGroup; path: string[] }>
  | IsHelpScope<'root', { commands: CommandTree }>;

/**
 * The fields shared by all explore scopes
 */
type IsExploreScope<T extends TreeScope, U> = U & {
  type: T;
};

/**
 * All scopes that can be explored
 */
export type ExploreScope =
  | IsExploreScope<'group', { group: CommandGroup; path: string[] }>
  | IsExploreScope<'root', { commands: CommandTree }>;

/**
 * The results of parsing flags
 */
type FlagParsingResult =
  | Variant<'failure', { error: ErrorParsingResult }>
  | Variant<'success', { parsed: FlagParsing }>;

/**
 * Attempt to find a command invocation in user-provided CLI args
 */
export function parseCommand(
  args: string[],
  commands: CommandTree,
  config: Config = resolveConfig()
): ParsingResult {
  const result = extractCommand({
    current: {
      args: new NormalizedArgs(args),
      commands,
      config,
      namespace: []
    }
  });

  return result.type === 'command'
    ? { ...result, run: buildCommandRunner(result.command, commands) }
    : result;
}

/**
 * Attempt to parse flags
 */
function tryParseFlags(
  args: NormalizedArgs,
  flags: Flags,
  options: { allowUnused?: boolean },
  help?: HelpScope
): FlagParsingResult {
  try {
    return {
      parsed: parseFlags(args, flags, options),
      type: 'success'
    };
  } catch (error) {
    if (error instanceof ParsingError) {
      return {
        error: {
          code: 'invalid-flag',
          help,
          message: error.message,
          type: 'error'
        },
        type: 'failure'
      };
    }

    throw error;
  }
}

/**
 * Build a runner for a parsed command
 */
function buildCommandRunner(
  parsed: ParsedCommand,
  commands: CommandTree
): CommandRunner {
  const {
    command,
    flags,
    providedFlags
  } = parsed;

  const values = extractValues(flags);

  return async function runCommand(context) {
    let output: string | undefined;

    try {
      const result = await command.handler(
        values as ValuesOf<Flags, 'narrow'>,
        {
          commands,
          context,
          providedFlags: new Set(providedFlags)
        }
      );

      if (typeof result === 'string') {
        output = result;
      }
    } catch (error) {
      if (error instanceof OperationalError) {
        return { error, type: 'failure' };
      } else {
        throw error;
      }
    }

    return {
      command: parsed,
      output,
      type: 'success'
    };
  };
}

/**
 * The traversal state for a command tree
 */
type TraversalState = {
  args: NormalizedArgs;
  commands: CommandTree;
  config: Config;
  group?: CommandGroup;
  namespace: string[];
};

/**
 * Extract a command from a list of arguments
 */
function extractCommand(
  { current }: { current: TraversalState }
): InternalParsingResult {
  while (true) {
    const coreFlags = tryParseFlags(
      current.args,
      useSharedFlags(
        current.config,
        current.group ? 'group' : 'root'
      ),
      { allowUnused: true }
    );

    if (coreFlags.type === 'failure') {
      return coreFlags.error;
    }

    const { flags } = coreFlags.parsed;
    const exploreFlag = getExploreFlagName(current.config);

    const showHelp = getSharedFlagValue(flags, 'help') === true;

    const showExplore = exploreFlag !== undefined
      && flags[exploreFlag]?.value === true;

    const { args } = current.args;
    const name = args[0];

    const [command, path] = name === undefined
      ? [undefined, current.namespace]
      : [getCommand(current.commands, name), [...current.namespace, name]];

    const help: HelpScope = current.group
      ? { group: current.group, path: current.namespace, type: 'group' }
      : { commands: current.commands, type: 'root' };

    const explore: ExploreScope = current.group
      ? { group: current.group, path: current.namespace, type: 'group' }
      : { commands: current.commands, type: 'root' };

    if (showHelp && (!name || !command)) {
      return { scope: help, type: 'help' };
    } else if (showExplore && (!name || !command)) {
      return { scope: explore, type: 'explore' };
    } else if (!name) {
      return {
        code: 'invalid-command',
        help,
        message: current.namespace.length
          ? `You must provide a subcommand: ${
            current.namespace.join(' ')
          } <subcommand>`
          : 'You must provide a command',
        type: 'error'
      };
    } else if (!command) {
      return {
        code: 'invalid-command',
        help,
        message: `Unknown command: ${path.join(' ')}`,
        type: 'error'
      };
    }

    const remainingArgs = new NormalizedArgs(args.slice(1));

    if (command.type === 'group') {
      current = {
        commands: command.subcommands,
        config: current.config,
        group: command,
        args: remainingArgs,
        namespace: path
      };

      continue;
    } else if (showHelp) {
      return {
        scope: { command, path, type: 'command' },
        type: 'help'
      };
    }

    const commandFlags = tryParseFlags(
      remainingArgs,
      command.flags || {},
      {},
      { command, path, type: 'command' }
    );

    if (commandFlags.type === 'failure') {
      return commandFlags.error;
    }

    const { parsed } = commandFlags;

    return {
      command: {
        ...parsed,
        command,
        path,
        providedFlags: parsed.provided
      },
      type: 'command'
    };
  }
}
