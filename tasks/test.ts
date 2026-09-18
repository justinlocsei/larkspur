import { applyMiddleware } from '../src/commands/middleware.ts';
import C from '../src/factory.ts';
import { setConfigVariables } from '../src/tests/properties/config.ts';
import { build } from './build.ts';
import { REPO_ROOT } from './helpers/paths.ts';
import { defineFilters, runSuite, runTests, SUITES } from './helpers/tests.ts';

import path from 'node:path';

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
        ({ reporter }) => {
          try {
            runTests([
              '--coverage',
              '--coverage.reporter',
              reporter
            ]);
          } catch (error) {
            if (reporter === 'html') {
              console.log(
                '\n>> View coverage in your browser at: file://'
                  + path.join(REPO_ROOT, 'coverage', 'index.html') + '\n'
              );
            }

            throw error;
          }
        }
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
