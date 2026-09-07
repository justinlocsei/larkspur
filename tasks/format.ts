import C from '../src/factory.ts';
import { localBin, run } from './helpers.ts';

export default C('Format the codebase', async () => {
  run(localBin('biome'), 'check', '--write', '--linter-enabled=false', '.');
  run(localBin('dprint'), 'fmt');
});
