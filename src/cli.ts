import type { EntryPoint } from './commands/types.ts';
import { runCLI } from './runner.js';
import type { CLIMetadata } from './types.ts';

import path from 'node:path';

/**
 * A provider for a CLI's entry point
 */
export type EntryPointProvider =
  | EntryPoint
  | (() => EntryPoint | Promise<EntryPoint>);

/**
 * Configuration for a CLI
 */
type Config = Partial<CLIMetadata> & {
  args?: string[];
};

/**
 * Run a CLI
 */
export async function run(
  entry: EntryPointProvider,
  config: Config = {}
): Promise<void> {
  const resolvedEntry = await resolveEntryPoint(entry);

  const {
    args = process.argv.slice(2),
    name = inferName()
  } = config;

  await runCLI({
    args,
    entry: resolvedEntry,
    meta: {
      description: config.description,
      name
    }
  });
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
function inferName(): string {
  const file = process.argv[1];

  if (!file) {
    throw new Error('No file name was found');
  }

  return path.basename(file, path.extname(file));
}
