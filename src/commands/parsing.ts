import { NormalizedArgs } from '../args.js';
import { OperationalError } from '../errors.js';
import type { ParsedFlags } from '../flags/parsing.js';
import { extractValues, ParsingError, parseFlags } from '../flags/parsing.js';
import type { Flags } from '../flags/types.js';
import type { SpecificValueOf, ValuesOf } from '../flags/values.js';
import { useFlags } from '../flags.js';
import type { DistributiveOmit } from '../types/utils.js';
import type { CompletionShell } from '../types.js';
import { COMPLETION_SHELLS } from '../types.js';
import type {
  ArgParsingDetails,
  Command,
  CommandGroup,
  CommandHandler,
  CommandTree
} from './types.js';

/**
 * A command extracted from a tree
 */
type FlattenedCommand = {
  command: CommandHandler;
  path: string[];
};

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
}>;

/**
 * The result of running a command
 */
export type RunResult = FailureRunResult | SuccessRunResult;

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
 * A request for shell completions
 */
type CompletionParsingResult = IsParsingResult<'completion', {
  shell: CompletionShell;
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
  | CommandParsingResult
  | CompletionParsingResult
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
 * Help for a specific command
 */
type CommandHelpScope = IsHelpScope<'command', {
  command: CommandHandler;
  path: string[];
}>;

/**
 * Help for grouped commands
 */
type GroupHelpScope = IsHelpScope<'group', {
  group: CommandGroup;
  path: string[];
}>;

/**
 * Help for a CLI's root commands
 */
type RootHelpScope = IsHelpScope<'root', {
  commands: CommandTree;
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

class CompletionRequest {
  shell: CompletionShell;

  /**
   * Create a completion request
   */
  constructor(shell: CompletionShell) {
    this.shell = shell;
  }
}

export const CORE_FLAGS = useFlags({
  complete: {
    choices: COMPLETION_SHELLS,
    description: 'Generate completions for the given shell',
    type: 'choice'
  },
  help: {
    default: false,
    description: 'Show help',
    type: 'boolean'
  }
});

/**
 * Get the value of a core flag
 */
function getCoreFlagValue<T extends keyof typeof CORE_FLAGS>(
  flags: ParsedFlags,
  id: T
) {
  return flags[id]?.value as SpecificValueOf<typeof CORE_FLAGS[T]> | undefined;
}

/**
 * Extract all commands contained in a node
 */
export function extractCommands(root: Command): FlattenedCommand[] {
  function extract(command: Command, path: string[]): FlattenedCommand[] {
    return command.type === 'group'
      ? Object.entries(command.subcommands).flatMap(([id, subcommand]) =>
        subcommand ? extract(subcommand, [...path, id]) : []
      )
      : [{ command, path }];
  }

  return extract(root, []);
}

/**
 * Attempt to find a command invocation in user-provided CLI args
 */
export function parseCommand(args: string[], commands: CommandTree, {
  allowUnknownFlags
}: {
  allowUnknownFlags?: boolean;
} = {}): ParsingResult {
  let command: ParsedCommand;

  try {
    command = extractCommand(new NormalizedArgs(args), commands, {
      allowUnknownFlags
    });
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
    } else if (signal instanceof CompletionRequest) {
      return {
        shell: signal.shell,
        type: 'completion'
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

  return async function runCommand() {
    try {
      await command.handler(values as ValuesOf<Flags, 'narrow'>, {
        args,
        commandPath: path,
        providedFlags: new Set(providedFlags)
      });
    } catch (error) {
      if (error instanceof OperationalError) {
        return { error, type: 'failure' };
      } else {
        throw error;
      }
    }

    return {
      command: parsed,
      type: 'success'
    };
  };
}

/**
 * Extract a command from a list of arguments
 */
function extractCommand(
  normalized: NormalizedArgs,
  commands: CommandTree,
  {
    allowUnknownFlags = false,
    group,
    parentPath = []
  }: {
    allowUnknownFlags?: boolean;
    group?: CommandGroup;
    parentPath?: string[];
  } = {}
): ParsedCommand {
  const { flags } = parseFlags(normalized, CORE_FLAGS, { allowUnused: true });
  const showHelp = getCoreFlagValue(flags, 'help') === true;
  const shell = getCoreFlagValue(flags, 'complete');

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
  } else if (!showHelp && shell) {
    throw new CompletionRequest(shell);
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

  if (command.type === 'group') {
    return extractCommand(remainingArgs, command.subcommands, {
      allowUnknownFlags,
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
        allowUnused: allowUnknownFlags
      });

      return {
        args: parsedFlags.args,
        command,
        flags: parsedFlags.flags,
        path,
        providedFlags: parsedFlags.provided
      };
    } catch (error) {
      if (error instanceof ParsingError) {
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
