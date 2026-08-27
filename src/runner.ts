import type {
  HelpScope,
  ParsingResult,
  RunResult
} from './commands/parsing.js';
import { parseCommand } from './commands/parsing.js';
import type { EntryPoint } from './commands/types.js';
import { coerceError, OperationalError } from './errors.js';
import { buildHelp } from './help.js';
import type { CLIMetadata } from './types.js';

/**
 * A logging function
 */
export type Logger = (message?: string) => void;

/**
 * A log level used when running a CLI
 */
export type LogLevel = 'info' | 'error';

/**
 * Logging handlers for a CLI
 */
type LoggingHandlers = Record<LogLevel, Logger>;

/**
 * A request to run a CLI
 */
export type RunRequest = {
  args: string[];
  entry: EntryPoint;
  logging?: LoggingHandlers;
  meta: CLIMetadata;
  onError?: (error: Error) => void;
};

/**
 * Run a CLI
 */
export async function runCLI({
  args,
  entry,
  logging: logger = {
    error: m => console.error(m),
    info: m => console.info(m)
  },
  meta,
  onError = () => (process.exitCode = 1)
}: RunRequest): Promise<void> {
  let parsing: ParsingResult;
  let execution: RunResult;

  function handleError<T extends Error>(
    error: T,
    format: (error: T) => string
  ): void {
    logger.error(format(error));
    onError(error);
  }

  function handleOperationalError(error: OperationalError): void {
    handleError(error, e => e.format());
  }

  function showHelp(scope: HelpScope): void {
    const help = buildHelp({
      cli: meta,
      scope
    });

    logger.info(help);
  }

  try {
    parsing = parseCommand(args, entry);
  } catch (error) {
    return handleOperationalError(
      OperationalError.wrap(error, 'Could not parse CLI arguments')
    );
  }

  if (parsing.type === 'error') {
    if (parsing.help) {
      showHelp(parsing.help);
      logger.info();
    }

    return handleOperationalError(new OperationalError(parsing.message));
  } else if (parsing.type === 'help') {
    return showHelp(parsing.scope);
  }

  try {
    execution = await parsing.run();
  } catch (error) {
    return handleError(coerceError(error), e => e.stack || e.message);
  }

  if (execution.type === 'failure') {
    return handleOperationalError(execution.error);
  }
}
