import { NormalizedArgs } from '../args.js';
import { OperationalError } from '../errors.js';
import type { FlagParsing, ParsedFlags } from '../flags/parsing.js';
import {
  extractValues,
  getSharedFlagValue,
  ParsingError,
  parseFlags
} from '../flags/parsing.js';
import { useSharedFlags } from '../flags/shared.js';
import type { Flags } from '../flags/types.js';
import type { ValuesOf } from '../flags/values.js';
import type { Variant } from '../types/utils.js';
import type { Context } from '../types.js';
import type {
  ArgParsingDetails,
  CommandGroup,
  CommandHandler,
  CommandTree
} from './types.js';

/**
 * An executable command extracted from CLI args
 */
export type ParsedCommand = {
  args: ArgParsingDetails;
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
 * The results of parsing CLI args
 */
export type ParsingResult =
  | CommandParsingResult & { run: CommandRunner }
  | ErrorParsingResult
  | HelpParsingResult;

/**
 * An internal parsing result
 */
type InternalParsingResult =
  | CommandParsingResult
  | ErrorParsingResult
  | HelpParsingResult;

/**
 * The fields shared by all help scopes
 */
type IsHelpScope<T extends string, U> = U & {
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
 * The results of parsing flags
 */
type FlagParsingResult =
  | Variant<'failure', { error: ErrorParsingResult }>
  | Variant<'success', { parsed: FlagParsing }>;

/**
 * Attempt to find a command invocation in user-provided CLI args
 */
export function parseCommand(args: string[], commands: CommandTree, {
  allowUnknownFlags
}: {
  allowUnknownFlags?: boolean;
} = {}): ParsingResult {
  const result = extractCommand({
    allowUnknownFlags,
    current: {
      args: new NormalizedArgs(args),
      commands,
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
    args,
    command,
    flags,
    path,
    providedFlags
  } = parsed;

  const values = extractValues(flags);

  return async function runCommand(context) {
    let output: string | undefined;

    try {
      const result = await command.handler(
        values as ValuesOf<Flags, 'narrow'>,
        {
          args,
          commands,
          commandPath: path,
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
  group?: CommandGroup;
  namespace: string[];
};

/**
 * Extract a command from a list of arguments
 */
function extractCommand({
  allowUnknownFlags = false,
  current
}: {
  allowUnknownFlags?: boolean;
  current: TraversalState;
}): InternalParsingResult {
  while (true) {
    const coreFlags = tryParseFlags(
      current.args,
      useSharedFlags(),
      { allowUnused: true }
    );

    if (coreFlags.type === 'failure') {
      return coreFlags.error;
    }

    const { flags } = coreFlags.parsed;
    const showHelp = getSharedFlagValue(flags, 'help') === true;

    const { args } = current.args;
    const name = args[0];

    const [command, path] = name === undefined
      ? [undefined, current.namespace]
      : [current.commands[name], [...current.namespace, name]];

    const help: HelpScope = current.group
      ? { group: current.group, path: current.namespace, type: 'group' }
      : { commands: current.commands, type: 'root' };

    if (showHelp && (!name || !command)) {
      return { scope: help, type: 'help' };
    }

    if (!name) {
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
      { allowUnused: allowUnknownFlags },
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
