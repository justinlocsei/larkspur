import C from '../src/factory.ts';
import { localBin, run } from './helpers.ts';

const SUITES = ['integration', 'properties', 'unit'] as const;

const test = (project: string) =>
  run(localBin('vitest'), 'run', '--project', project, '--reporter', 'verbose');

export default C(
  'Run tests',
  {
    suite: C.flag('choice', 'Only run the given test suites', {
      allowMany: true,
      choices: SUITES
    })
  },
  async ({ suite: suites = SUITES }) => {
    for (const suite of suites) {
      test(suite);
    }
  }
);
