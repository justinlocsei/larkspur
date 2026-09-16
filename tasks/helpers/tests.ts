import C from '../../src/factory.ts';
import type { UserCompletion } from '../../src/flags/types.ts';
import type { EnvironmentVariables } from '../../src/types.ts';
import { compact } from '../../src/utils.ts';
import { npx } from './commands.ts';
import { REPO_ROOT } from './paths.ts';

import { globSync } from 'node:fs';
import path from 'node:path';

// The available test suites, in order of execution
export const SUITES = ['unit', 'integration', 'properties'] as const;

/**
 * A locator for test files
 */
type FileLocator = {
  exclude?: string;
  extension: string;
  root: string[];
};

/**
 * Create a completion provider for test files
 */
function suggestTestFiles(
  { exclude, extension, root }: FileLocator
): UserCompletion {
  const rootDir = path.join(REPO_ROOT, ...root);
  const glob = (ext: string) => path.join(rootDir, '**', `*.${ext}`);

  const includeGlob = glob(extension);
  const excludeGlob = exclude && glob(exclude);
  const extSlice = extension.length * -1 - 1;

  return () => {
    let files = globSync(includeGlob);

    if (excludeGlob) {
      const skip = new Set(globSync(excludeGlob));
      files = files.filter(f => !skip.has(f));
    }

    return files
      .map(f => path.relative(rootDir, f))
      .map(f => f.slice(0, extSlice))
      .sort();
  };
}

/**
 * Define shared filtering flags
 */
export function defineFilters(files: FileLocator) {
  return C.flags({
    file: C.flag(
      'string',
      'Only run tests in files whose name matches the given pattern',
      { completion: suggestTestFiles(files) }
    ),
    name: C.flag(
      'string',
      'Only run tests whose name matches the given pattern'
    )
  });
}

/**
 * Run tests using Vitest
 */
export function runTests(args: string[], env: EnvironmentVariables = {}): void {
  npx(
    'vitest',
    ['run', '--reporter', 'verbose', ...args],
    { env: { ...env, NODE_OPTIONS: '--throw-deprecation' } }
  );
}

/**
 * Run a test suite
 */
export function runSuite(
  suite: typeof SUITES[number],
  { file, name }: { file?: string; name?: string } = {},
  env: EnvironmentVariables = {}
): void {
  runTests(
    compact([
      '--project',
      suite,
      ...(name ? ['-t', name] : []),
      file
    ]),
    env
  );
}
