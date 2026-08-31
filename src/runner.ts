import type {
  ParsedCommand,
  ParsingResult,
  RunResult
} from './commands/parsing.js';
import { parseCommand } from './commands/parsing.js';
import type { EntryPoint } from './commands/types.js';
import { buildCompletions } from './completion.js';
import { coerceError, OperationalError } from './errors.js';
import { buildHelp } from './help.js';
import type { Context } from './types.js';

/**
 * A request to run a CLI
 */
export type RunRequest = {
  args: string[];
  context: Context;
  entry: EntryPoint;
};

/**
 * Define a response to a request to run a CLI
 */
type IsRunResponse<T extends string, U> = U & {
  type: T;
};

/**
 * A completion script generated for a CLI
 */
type CompletionRunResponse = IsRunResponse<'completion', {
  script: string;
}>;

/**
 * A CLI run that failed with an error
 */
type ErrorRunResponse = IsRunResponse<'error', {
  error: Error;
  help?: string;
}>;

/**
 * A CLI run that returned early with a help message
 */
type HelpRunResponse = IsRunResponse<'help', {
  message: string;
}>;

/**
 * A CLI run that completed successfully
 */
type SuccessRunResponse = IsRunResponse<'success', {
  command: ParsedCommand;
}>;

/**
 * The result of running a CLI
 */
export type RunResponse =
  | CompletionRunResponse
  | ErrorRunResponse
  | HelpRunResponse
  | SuccessRunResponse;

/**
 * Report a CLI failure
 */
function failWith(error: Error, help?: string): ErrorRunResponse {
  return { error, help, type: 'error' };
}

/**
 * Run a CLI
 */
export async function runCLI({
  args,
  context,
  entry
}: RunRequest): Promise<RunResponse> {
  let parsing: ParsingResult;

  try {
    parsing = parseCommand(args, entry);
  } catch (error) {
    return failWith(
      OperationalError.wrap(error, 'Could not parse CLI arguments')
    );
  }

  switch (parsing.type) {
    case 'completion':
      return {
        script: buildCompletions(parsing.shell, {
          commands: entry,
          context
        }),
        type: 'completion'
      };

    case 'error':
      return failWith(
        new OperationalError(parsing.message),
        parsing.help
          ? buildHelp({ context, scope: parsing.help })
          : undefined
      );

    case 'help':
      return {
        message: buildHelp({ context, scope: parsing.scope }),
        type: 'help'
      };
  }

  let execution: RunResult;

  try {
    execution = await parsing.run();
  } catch (error) {
    return failWith(coerceError(error));
  }

  return execution.type === 'failure'
    ? failWith(execution.error)
    : { command: execution.command, type: 'success' };
}
