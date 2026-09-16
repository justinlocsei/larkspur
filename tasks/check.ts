import C from '../src/factory.ts';
import { npx } from './helpers/commands.ts';

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
      npx('biome', ['lint', '.', '--error-on-warnings']);
    }

    if (only.includes('formatting')) {
      npx('biome', ['ci', '--linter-enabled=false', '.']);
      npx('dprint', ['check']);
    }

    if (only.includes('types')) {
      npx('tsc', ['--noEmit']);
    }
  }
);
