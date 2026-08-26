import { NormalizedArgs } from './args.js';
import { OperationalError } from './errors.js';
import type { ParsedFlags, ProvidedFlagNames } from './flags/parsing.js';
import {
  extractValues,
  ParsingError as FlagParsingError,
  parseFlags
} from './flags/parsing.js';
import type { FlagContext, Flags } from './flags/types.js';
import type { ValuesOf } from './flags/values.js';
import { useFlags } from './flags.js';
import type { DistributiveOmit } from './types/utils.js';

/**
 * The fields shared by all commands
 */
type BaseCommand = {
  description: string;
};

/**
 * A single command
 */
export type Command<
  TFlags extends Flags = Flags,
  TContext extends FlagContext = 'narrow'
> = BaseCommand & {
  allowUnknownFlags?: boolean;
  flags?: TFlags;
  handler: CommmandHandlerFn<TFlags, TContext>;
  subcommands?: undefined;
};

/**
 * A command's handler function
 */
type CommmandHandlerFn<
  TFlags extends Flags = Flags,
  TContext extends FlagContext = 'narrow'
> = (
  flags: ValuesOf<TFlags, TContext>,
  details: CommandParsingDetails<TFlags>
) => Promise<void>;

/**
 * Details on how a command was parsed
 */
export type CommandParsingDetails<T extends Flags = Flags> = {
  args: ArgParsingDetails;
  commandPath: string[];
  providedFlags: ProvidedFlagNames<T>;
};

/**
 * Details on how a command's arguments were parsed
 */
type ArgParsingDetails = {
  all: string[];
  extra: string[];
  parsed: string[];
};

/**
 * A group of subcommands
 */
type CommandGroup = BaseCommand & {
  flags?: undefined;
  handler?: undefined;
  subcommands: CommandTree;
};

/**
 * A node in a tree of commands
 */
export type CommandNode<
  TFlags extends Flags = Flags,
  TContext extends FlagContext = 'narrow'
> = Command<TFlags, TContext> | CommandGroup;

/**
 * A tree of named commands
 */
export type CommandTree<T extends string = string> = Record<T, CommandNode>;

/**
 * A command extracted from a tree
 */
type FlattenedCommand = {
  command: Command;
  path: string[];
};

/**
 * An executable command extracted from CLI args
 */
type ParsedCommand = {
  args: ArgParsingDetails;
  command: Command<Flags>;
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
 * The result of a successful command run
 */
type SuccessRunResult = IsRunResult<'success', {
  command: ParsedCommand;
}>;

/**
 * A failure when running a command
 */
type FailureRunResult = IsRunResult<'failure', {
  error: OperationalError;
}>;

/**
 * The result of running a command
 */
export type RunResult = SuccessRunResult | FailureRunResult;

/**
 * A function that runs a command
 */
type CommandRunner = () => Promise<RunResult>;

/**
 * The successful extraction of a command from CLI args
 */
type CommandParsingResult = IsParsingResult<'command', {
  command: ParsedCommand;
  run: CommandRunner;
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
 * A request for help in the parsed args
 */
type HelpParsingResult = IsParsingResult<'help', {
  scope: HelpScope;
}>;

/**
 * The results of parsing CLI args
 */
export type ParsingResult =
  | CommandParsingResult
  | ErrorParsingResult
  | HelpParsingResult;

/**
 * The fields shared by all help scopes
 */
type IsHelpScope<T extends string, U> = U & {
  flags: Flags;
  type: T;
};

/**
 * Help for a CLI's root commands
 */
type RootHelpScope = IsHelpScope<'root', {
  commands: CommandTree;
}>;

/**
 * Help for grouped commands
 */
type GroupHelpScope = IsHelpScope<'group', {
  group: CommandGroup;
  path: string[];
}>;

/**
 * Help for a specific command
 */
type CommandHelpScope = IsHelpScope<'command', {
  command: Command;
  path: string[];
}>;

/**
 * All possible scopes for showing help
 */
export type HelpScope =
  | CommandHelpScope
  | GroupHelpScope
  | RootHelpScope;

/**
 * The scope of a help request
 */
type HelpRequestScope = DistributiveOmit<HelpScope, 'flags'>;

class AbortRequest {
  code: ParsingErrorCode;
  help?: HelpRequestScope;
  message: string;

  /**
   * Create request to abort the parsing process
   */
  constructor(
    message: string,
    code: ParsingErrorCode,
    help?: HelpRequestScope
  ) {
    this.code = code;
    this.message = message;
    this.help = help;
  }
}

class HelpRequest {
  scope: HelpRequestScope;

  /**
   * Create a help request
   */
  constructor(scope: HelpRequestScope) {
    this.scope = scope;
  }
}

export const CORE_FLAGS = useFlags({
  help: {
    default: false,
    description: 'Show help',
    type: 'boolean'
  }
});

/**
 * Get the value of a core flag
 */
function getCoreFlagValue(
  flags: ParsedFlags,
  id: keyof typeof CORE_FLAGS
): unknown {
  return flags[id]?.value;
}

/**
 * Determine whether a command is a group
 */
export function isCommandGroup(
  command: CommandNode
): command is CommandGroup {
  return command.subcommands !== undefined;
}

/**
 * Extract all commands contained in a node
 */
export function extractCommands(root: CommandNode): FlattenedCommand[] {
  function extract(command: CommandNode, path: string[]): FlattenedCommand[] {
    return isCommandGroup(command)
      ? Object.entries(command.subcommands).flatMap(([id, subcommand]) =>
        extract(subcommand, [...path, id])
      )
      : [{ command, path }];
  }

  return extract(root, []);
}

/**
 * Define a CLI command
 */
export function defineCommand<T extends Flags>(
  command: CommandNode<T, 'narrow'>
): CommandNode<Flags, 'wide'> {
  return command as CommandNode<Flags, 'wide'>;
}

/**
 * Attempt to find a command invocation in user-provided CLI args
 */
export function parse(args: string[], commands: CommandTree): ParsingResult {
  let command: ParsedCommand;

  try {
    command = parseCommand(new NormalizedArgs(args), commands);
  } catch (signal) {
    if (signal instanceof AbortRequest) {
      const { help } = signal;

      return {
        code: signal.code,
        help: help && {
          ...help,
          flags: CORE_FLAGS
        },
        message: signal.message,
        type: 'error'
      };
    } else if (signal instanceof HelpRequest) {
      return {
        scope: {
          ...signal.scope,
          flags: CORE_FLAGS
        },
        type: 'help'
      };
    } else {
      throw signal;
    }
  }

  return {
    command,
    run: buildCommandRunner(command),
    type: 'command'
  };
}

/**
 * Build a runner for a parsed command
 */
function buildCommandRunner(parsed: ParsedCommand): CommandRunner {
  const {
    args,
    command,
    flags,
    path,
    providedFlags
  } = parsed;

  const values = extractValues(flags);

  return (async () => {
    try {
      await command.handler(values as ValuesOf<Flags, 'narrow'>, {
        args,
        commandPath: path,
        providedFlags: new Set(providedFlags)
      });
    } catch (error) {
      if (error instanceof OperationalError) {
        return {
          error,
          type: 'failure'
        };
      } else {
        throw error;
      }
    }

    return {
      command: parsed,
      type: 'success'
    };
  });
}

/**
 * Extract a command from a list of arguments
 */
function parseCommand(
  normalized: NormalizedArgs,
  commands: CommandTree,
  {
    group,
    parentPath = []
  }: {
    group?: CommandGroup;
    parentPath?: string[];
  } = {}
): ParsedCommand {
  const { flags } = parseFlags(normalized, CORE_FLAGS, { allowUnused: true });
  const showHelp = getCoreFlagValue(flags, 'help') === true;

  const { args } = normalized;
  const name = args[0];

  const [command, path] = name === undefined
    ? [undefined, parentPath]
    : [commands[name], [...parentPath, name]];

  const commandHelp: HelpRequestScope = group
    ? { group, path: parentPath, type: 'group' }
    : { commands, type: 'root' };

  if (showHelp && (!name || !command)) {
    throw new HelpRequest(commandHelp);
  }

  if (!name) {
    throw new AbortRequest(
      parentPath.length
        ? `You must provide a subcommand: ${parentPath.join(' ')} <subcommand>`
        : 'You must provide a command',
      'invalid-command',
      commandHelp
    );
  } else if (!command) {
    throw new AbortRequest(
      `Unknown command: ${path.join(' ')}`,
      'invalid-command',
      commandHelp
    );
  }

  const remainingArgs = new NormalizedArgs(args.slice(1));

  if (isCommandGroup(command)) {
    return parseCommand(remainingArgs, command.subcommands, {
      group: command,
      parentPath: path
    });
  } else if (showHelp) {
    throw new HelpRequest({
      command,
      path,
      type: 'command'
    });
  } else {
    try {
      const parsedFlags = parseFlags(remainingArgs, command.flags || {}, {
        allowUnused: command.allowUnknownFlags ?? false
      });

      return {
        args: parsedFlags.args,
        command,
        flags: parsedFlags.flags,
        path,
        providedFlags: parsedFlags.provided
      };
    } catch (error) {
      if (error instanceof FlagParsingError) {
        throw new AbortRequest(error.message, 'invalid-flag', {
          command,
          path,
          type: 'command'
        });
      } else {
        throw error;
      }
    }
  }
}
