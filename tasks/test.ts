import C from '../src/factory.ts';
import type { ValuesOf } from '../src/flags/values.ts';
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

/**
 * Run a test suite
 */
function runSuite(
  suite: typeof SUITES[number],
  { file, name }: ValuesOf<typeof FILTERS, 'narrow'> = {},
  env: EnvironmentVariables = {}
): void {
  run(
    'vitest',
    compact([
      'run',
      '--project',
      suite,
      '--reporter',
      'verbose',
      file,
      ...(name ? ['-t', name] : [])
    ]),
    { env: { ...env, NODE_OPTIONS: '--throw-deprecation' } }
  );
}

export default C.group('Run tests', {
  all: C('Run all tests', () => {
    for (const suite of SUITES) {
      runSuite(suite);
    }
  }),

  integration: C(
    'Run integration tests',
    {
      ...FILTERS,
      build: C.flag('boolean', 'Build the project before running tests', {
        default: true
      })
    },
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
