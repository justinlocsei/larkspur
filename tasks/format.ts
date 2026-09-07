import C from '../src/factory.ts';
import { run } from './helpers.ts';

export default C('Format the codebase', async () => {
  run('biome', 'check', '--write', '--linter-enabled=false', '.');
  run('dprint', 'fmt');
});
