import C from '../src/factory.ts';
import { run } from './helpers.ts';

const SUITES = ['integration', 'properties', 'unit'] as const;

export default C({
  allowExtraArgs: true,
  description: 'Run tests',
  flags: {
    suite: C.flag('choice', 'Only run the given test suites', {
      choices: SUITES,
      default: SUITES,
      repeatable: true
    })
  },
  handler: async ({ suite: suites }, { args }) => {
    for (const suite of suites) {
      run(
        'vitest',
        'run',
        '--project',
        suite,
        '--reporter',
        'verbose',
        ...args.extra
      );
    }
  }
});
