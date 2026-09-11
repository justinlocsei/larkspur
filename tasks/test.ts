import C from '../src/factory.ts';
import { setConfigVariables } from '../src/tests/properties/config.ts';
import type { EnvironmentVariables } from '../src/types.ts';
import { build } from './build.ts';
import { run } from './helpers.ts';

const SUITES = ['integration', 'properties', 'unit'] as const;

/**
 * Run a test suite
 */
function runSuite(
  suite: typeof SUITES[number],
  name: string = '',
  env: EnvironmentVariables = {}
): void {
  run(
    'vitest',
    [
      'run',
      '--project',
      suite,
      '--reporter',
      'verbose',
      name
    ],
    { env }
  );
}

const name = C.flag(
  'string',
  'Only run tests in files matching the given pattern'
);

export default C.group('Run tests', {
  all: C('Run all tests', () => {
    for (const suite of SUITES) {
      runSuite(suite);
    }
  }),

  integration: C(
    'Run integration tests',
    {
      build: C.flag('boolean', 'Build the project before running tests', {
        default: true
      }),
      name
    },
    flags => {
      if (flags.build) {
        build();
      }

      runSuite('integration', flags.name);
    }
  ),

  property: C(
    'Run property tests',
    {
      name,
      runs: C.flag('number', 'The number of test runs'),
      seed: C.flag('number', 'A fixed seed')
    },
    ({ name, runs, seed }) =>
      runSuite('properties', name, setConfigVariables({ runs, seed }))
  ),

  unit: C(
    'Run unit tests',
    { name },
    flags => runSuite('unit', flags.name)
  )
});
