import { coerceError } from './errors.ts';
import type { VersionContext, VersionProvider } from './types.ts';

import fs from 'node:fs';
import path from 'node:path';

const PACKAGE_JSON = 'package.json';

/**
 * Build a version context from a possible file path
 */
function createContext(file?: string): VersionContext {
  const getEntryFile = () => resolveEntryFile(file);

  return {
    getEntryFile,
    getPackageVersion: () => readPackageVersion(getEntryFile())
  };
}

/**
 * Resolve a package manifest path in a directory
 */
function resolvePackageManifest(directory: string): string | undefined {
  const candidate = path.join(directory, PACKAGE_JSON);

  if (!fs.existsSync(candidate)) {
    return undefined;
  }

  const packagePath = fs.realpathSync(candidate);

  if (path.basename(packagePath) !== PACKAGE_JSON) {
    throw new Error(`Invalid package manifest path: ${packagePath}`);
  }

  return packagePath;
}

/**
 * Read the version from the nearest package.json file
 */
function readPackageVersion(entryFile: string): string {
  let dir = path.dirname(entryFile);

  while (true) {
    const packagePath = resolvePackageManifest(dir);

    if (packagePath) {
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
 * Determine the absolute path to a CLI entry file
 */
function resolveEntryFile(file?: string): string {
  if (!file) {
    throw new Error('No entry file was provided');
  }

  const absolute = path.resolve(file);

  try {
    return fs.realpathSync(absolute);
  } catch {
    throw new Error(`Could not resolve entry path: ${file}`);
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
