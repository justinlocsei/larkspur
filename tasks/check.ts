import C from '../src/factory.ts';
import { run } from './helpers.ts';

const CHECKS = ['code', 'formatting', 'types'] as const;

export default C(
  'Check the codebase',
  {
    only: C.flag('choice', 'Only run the given checks', {
      allowMany: true,
      choices: CHECKS
    })
  },
  async ({ only = CHECKS }) => {
    if (only.includes('code')) {
      run('biome', 'lint', '.');
    }

    if (only.includes('formatting')) {
      run('biome', 'ci', '--linter-enabled=false', '.');
      run('dprint', 'check');
    }

    if (only.includes('types')) {
      run('tsc', '--noEmit');
    }
  }
);
