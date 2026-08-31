import type { EntryPoint } from './commands/types.ts';
import { createContext } from './context.js';
import { OperationalError } from './errors.js';
import { runCLI } from './runner.js';
import type { UserConfig } from './types/config.js';
import type { Metadata } from './types.ts';

import path from 'node:path';

/**
 * A logging function
 */
type Logger = (message?: string) => void;

/**
 * A supported log level
 */
export type LogLevel = 'error' | 'info';

/**
 * Logging handlers for a CLI
 */
type LoggingHandlers = Record<LogLevel, Logger>;

/**
 * A provider for a CLI's entry point
 */
export type EntryPointProvider =
  | EntryPoint
  | (() => EntryPoint | Promise<EntryPoint>);

/**
 * Options for running a CLI
 */
export type RunOptions = Partial<Metadata> & {
  args?: string[];
  config?: UserConfig;
  logging?: LoggingHandlers;
  onError?: (error: Error) => void;
};

/**
 * Run a CLI
 */
export async function run(
  entry: EntryPointProvider,
  options: RunOptions = {}
): Promise<void> {
  const resolvedEntry = await resolveEntryPoint(entry);

  const {
    args = process.argv,
    config,
    description,
    logging = {
      error: m => console.error(m),
      info: m => console.info(m)
    },
    onError = () => (process.exitCode = 1),
    name = inferName(args)
  } = options;

  const context = createContext(
    { description, name },
    config
  );

  const response = await runCLI({
    args: args.slice(2),
    context,
    entry: resolvedEntry
  });

  switch (response.type) {
    case 'error': {
      const { error, help = '' } = response;

      if (help) {
        logging.info(help);
        logging.info();
      }

      logging.error(
        error instanceof OperationalError
          ? error.message
          : error.stack || error.message
      );

      onError(error);
      break;
    }

    case 'help':
      logging.info(response.message);
      break;

    case 'success': {
      const output = response.output?.trim();

      if (output) {
        logging.info(output);
      }
    }
  }
}

/**
 * Resolve the requested entry point
 */
async function resolveEntryPoint(
  provider: EntryPointProvider
): Promise<EntryPoint> {
  return typeof provider === 'function'
    ? provider()
    : provider;
}

/**
 * Infer the name of the CLI
 */
function inferName(argv: string[]): string {
  const file = argv[1];

  if (!file) {
    throw new Error('Could not infer the CLI name from the received arguments');
  }

  return path.basename(file, path.extname(file));
}
