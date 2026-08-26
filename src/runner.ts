import { parse } from './commands.js';
import type {
  CommandTree,
  HelpScope,
  ParsingResult,
  RunResult
} from './commands.ts';
import { coerceError, OperationalError } from './errors.js';
import { buildHelp } from './help.js';

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
  commands: CommandTree;
  description?: string;
  logging?: LoggingHandlers;
  name: string;
  onError?: (error: Error) => void;
};

/**
 * Run a CLI
 */
export async function runCLI({
  args,
  commands,
  description,
  logging: logger = {
    error: m => console.error(m),
    info: m => console.info(m)
  },
  name,
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
      cliName: name,
      description,
      scope
    });

    logger.info(help);
  }

  try {
    parsing = parse(args, commands);
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
