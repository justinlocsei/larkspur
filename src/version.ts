import { coerceError } from './errors.ts';
import type { VersionContext, VersionProvider } from './types.ts';

import fs from 'node:fs';
import path from 'node:path';

/**
 * Build a version context from a possible file path
 */
function createContext(file?: string): VersionContext {
  const getScriptFile = () => resolveScriptFile(file);
  const getScriptDir = () => path.dirname(getScriptFile());

  return {
    getPackageVersion: () => readPackageVersion(getScriptDir()),
    getScriptDir,
    getScriptFile
  };
}

/**
 * Read the version from the nearest package.json file
 */
function readPackageVersion(startDir: string): string {
  let dir = startDir;

  while (true) {
    const packagePath = path.join(dir, 'package.json');

    if (fs.existsSync(packagePath)) {
      let parsed: unknown;

      try {
        parsed = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      } catch (error) {
        throw new Error(
          `Could not parse package.json: ${packagePath}`,
          { cause: coerceError(error) }
        );
      }

      const manifest = parsed as { version: string };

      if (
        typeof parsed !== 'object'
        || parsed === null
        || typeof manifest.version !== 'string'
      ) {
        throw new Error(
          `Could not read a version from package.json: ${packagePath}`
        );
      }

      return manifest.version;
    }

    const parent = path.dirname(dir);

    if (parent === dir) {
      throw new Error('No package.json was found');
    }

    dir = parent;
  }
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
