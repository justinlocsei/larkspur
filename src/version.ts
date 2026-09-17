import type { VersionContext, VersionProvider } from './types.ts';

import fs from 'node:fs';
import path from 'node:path';

/**
 * Build a version context from a possible file path
 */
function createContext(file?: string): VersionContext {
  let script: string | undefined;

  const resolveScript = (): string => {
    script ??= resolveScriptFile(file);

    return script;
  };

  return {
    getScriptDir: () => path.dirname(resolveScript()),
    getScriptFile: resolveScript
  };
}

/**
 * Determine the absolute path to a script's source file
 */
function resolveScriptFile(file?: string): string {
  if (!file) {
    throw new Error('No script file was provided');
  }

  const absolute = path.resolve(file);

  try {
    return fs.realpathSync(absolute);
  } catch {
    throw new Error(`Could not resolve script path: ${file}`);
  }
}

/**
 * Resolve a version provider to a concrete version
 */
export async function resolveVersion(
  provider: VersionProvider,
  file?: string
): Promise<string> {
  return typeof provider === 'function'
    ? provider(createContext(file))
    : provider;
}
