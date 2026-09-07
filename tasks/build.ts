import C from '../src/factory.ts';
import { run } from './helpers.ts';

export default C(
  'Build Larkspur',
  async () => run('tsdown')
);
