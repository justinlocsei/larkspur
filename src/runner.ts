import type {
  ParsedCommand,
  ParsingResult,
  RunResult
} from './commands/parsing.js';
import { parseCommand } from './commands/parsing.js';
import type { EntryPoint } from './commands/types.js';
import { coerceError, OperationalError } from './errors.js';
import { buildHelp } from './help.js';
import type { CLIMetadata } from './types.js';

/**
 * A request to run a CLI
 */
export type RunRequest = {
  args: string[];
  entry: EntryPoint;
  meta: CLIMetadata;
};

/**
 * Define a response to a request to run a CLI
 */
type IsRunResponse<T extends string, U> = U & {
  type: T;
};

/**
 * A CLI run that completed successfully
 */
type SuccessRunResponse = IsRunResponse<'success', {
  command: ParsedCommand;
}>;

/**
 * A CLI run that returned early with a help message
 */
type HelpRunResponse = IsRunResponse<'help', {
  message: string;
}>;

/**
 * A CLI run that failed with an error
 */
export type ErrorRunResponse = IsRunResponse<'error', {
  error: Error;
  help?: string;
}>;

/**
 * The result of running a CLI
 */
export type RunResponse =
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
  entry,
  meta
}: RunRequest): Promise<RunResponse> {
  let parsing: ParsingResult;

  try {
    parsing = parseCommand(args, entry);
  } catch (error) {
    return failWith(
      OperationalError.wrap(error, 'Could not parse CLI arguments')
    );
  }

  if (parsing.type === 'error') {
    return failWith(
      new OperationalError(parsing.message),
      parsing.help
        ? buildHelp({ cli: meta, scope: parsing.help })
        : undefined
    );
  } else if (parsing.type === 'help') {
    return {
      message: buildHelp({ cli: meta, scope: parsing.scope }),
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
