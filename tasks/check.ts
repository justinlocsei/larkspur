import C from '../src/factory.ts';
import { run } from './helpers/commands.ts';

const CHECKS = ['code', 'formatting', 'types'] as const;

export default C(
  'Check the codebase',
  {
    only: C.flag('choice', 'Only run the given checks', {
      choices: CHECKS,
      default: CHECKS,
      repeatable: true
    })
  },
  ({ only }) => {
    if (only.includes('code')) {
      run('biome', ['lint', '.', '--error-on-warnings']);
    }

    if (only.includes('formatting')) {
      run('biome', ['ci', '--linter-enabled=false', '.']);
      run('dprint', ['check']);
    }

    if (only.includes('types')) {
      run('tsc', ['--noEmit']);
    }
  }
);
