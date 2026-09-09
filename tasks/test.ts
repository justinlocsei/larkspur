import C from '../src/factory.ts';
import { run } from './helpers.ts';

const SUITES = ['integration', 'properties', 'unit'] as const;

export default C({
  description: 'Run tests',
  flags: {
    name: C.flag(
      'string',
      'Only run tests in files matching the given pattern'
    ),
    suite: C.flag('choice', 'Only run the given test suites', {
      choices: SUITES,
      default: SUITES,
      repeatable: true
    })
  },
  handler: async ({ name = '', suite: suites }) => {
    for (const suite of suites) {
      run('vitest', [
        'run',
        '--project',
        suite,
        '--reporter',
        'verbose',
        name
      ]);
    }
  }
});
