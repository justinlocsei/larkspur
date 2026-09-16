import type { EnvironmentVariables } from '../../src/types.ts';
import { compact } from '../../src/utils.ts';
import { run } from '../helpers.ts';

// The available test suites, in order of execution
export const SUITES = ['unit', 'integration', 'properties'] as const;

/**
 * Run tests using vitest
 */
export function runTests(args: string[], env: EnvironmentVariables = {}): void {
  run(
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
