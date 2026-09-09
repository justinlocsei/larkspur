import type { EntryPoint } from './commands/types.ts';
import { createContext } from './context.ts';
import { OperationalError } from './errors.ts';
import { runCLI } from './runner.ts';
import type { UserConfig } from './types/config.ts';
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
 * User-facing options for running a CLI
 */
export type UserOptions = Partial<Metadata> & UserConfig;

/**
 * Internal options for running a CLI
 */
export type InternalOptions = {
  args?: string[];
  logging?: LoggingHandlers;
  onError?: (error: Error) => void;
};

/**
 * Run a CLI
 */
export async function run(
  entry: EntryPointProvider,
  options: UserOptions = {},
  internal: InternalOptions = {}
): Promise<void> {
  const resolvedEntry = await resolveEntryPoint(entry);

  const {
    args = process.argv,
    logging: log = {
      error: m => console.error(m || ''),
      info: m => console.info(m || '')
    },
    onError = () => (process.exitCode = 1)
  } = internal;

  const {
    completions,
    description,
    help,
    name = inferName(args)
  } = options;

  const context = createContext(
    { description, name },
    { completions, help }
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
        log.info(help);
        log.info();
      }

      log.error(
        error instanceof OperationalError
          ? error.message
          : error.stack || error.message
      );

      onError(error);
      break;
    }

    case 'help':
      log.info(response.message);
      break;

    case 'success': {
      const output = response.output?.trim();

      if (output) {
        log.info(output);
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
