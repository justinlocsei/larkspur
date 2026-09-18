import { applyMiddleware } from '../src/commands/middleware.ts';
import C from '../src/factory.ts';
import { setConfigVariables } from '../src/tests/properties/config.ts';
import { build } from './build.ts';
import { defineFilters, runSuite, runTests, SUITES } from './helpers/tests.ts';

const preBuild = C.middleware(
  'Pre-build Larkspur',
  {
    build: C.flag(
      'boolean',
      'Build the larkspur package before running tests',
      { default: true }
    )
  },
  async (next, { flags }) => {
    if (flags.build) {
      build();
    }

    await next();
  }
);

export default C.group('Run tests', {
  ...applyMiddleware(
    [preBuild],
    C.tree({
      all: C('Run all tests', () => {
        for (const suite of SUITES) {
          runSuite(suite);
        }
      }),

      coverage: C(
        'Run all tests with coverage',
        {
          reporter: C.flag('choice', 'A coverage reporter', {
            choices: ['html', 'text'],
            default: 'text'
          })
        },
        flags =>
          runTests([
            '--coverage',
            '--coverage.reporter',
            flags.reporter
          ])
      ),

      integration: C(
        'Run integration tests',
        defineFilters({
          extension: 'test.ts',
          root: ['test', 'clis']
        }),
        flags => runSuite('integration', flags)
      )
    })
  ),

  property: C(
    'Run property tests',
    {
      ...defineFilters({
        extension: 'prop.test.ts',
        root: ['src']
      }),
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
    defineFilters({
      exclude: 'prop.test.ts',
      extension: 'test.ts',
      root: ['src']
    }),
    flags => runSuite('unit', flags)
  )
});
