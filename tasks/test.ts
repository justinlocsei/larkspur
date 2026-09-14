import C from '../src/factory.ts';
import type { ValuesOf } from '../src/index.ts';
import { setConfigVariables } from '../src/tests/properties/config.ts';
import type { EnvironmentVariables } from '../src/types.ts';
import { compact } from '../src/utils.ts';
import { build } from './build.ts';
import { run } from './helpers.ts';

// The available test suites, in order of execution
const SUITES = ['unit', 'integration', 'properties'] as const;

// Shared filter flags for all test suites
const FILTERS = C.flags({
  file: C.flag('string', 'Only run tests in files matching the given pattern'),
  name: C.flag('string', 'Only run tests whose name matches the given pattern')
});

// Shared flags for pre-test builds
const BUILD = C.flags({
  build: C.flag('boolean', 'Build the project before running tests', {
    default: true
  })
});

/**
 * Run tests using vitest
 */
function runTests(args: string[], env: EnvironmentVariables = {}): void {
  run(
    'vitest',
    ['run', '--reporter', 'verbose', ...args],
    { env: { ...env, NODE_OPTIONS: '--throw-deprecation' } }
  );
}

/**
 * Run a test suite
 */
function runSuite(
  suite: typeof SUITES[number],
  { file, name }: ValuesOf<typeof FILTERS> = {},
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

export default C.group('Run tests', {
  all: C('Run all tests', () => {
    for (const suite of SUITES) {
      runSuite(suite);
    }
  }),

  coverage: C(
    'Run all tests with coverage',
    {
      ...BUILD,
      reporter: C.flag('choice', 'A coverage reporter', {
        choices: ['html', 'text'],
        default: 'text'
      })
    },
    flags => {
      if (flags.build) {
        build();
      }

      runTests([
        '--coverage',
        '--coverage.reporter',
        flags.reporter
      ]);
    }
  ),

  integration: C(
    'Run integration tests',
    { ...BUILD, ...FILTERS },
    flags => {
      if (flags.build) {
        build();
      }

      runSuite('integration', flags);
    }
  ),

  property: C(
    'Run property tests',
    {
      ...FILTERS,
      runs: C.flag('number', 'The number of test runs'),
      seed: C.flag('number', 'A fixed seed')
    },
    flags => {
      const { runs, seed } = flags;

      return runSuite(
        'properties',
        flags,
        setConfigVariables({ runs, seed })
      );
    }
  ),

  unit: C(
    'Run unit tests',
    FILTERS,
    flags => runSuite('unit', flags)
  )
});
