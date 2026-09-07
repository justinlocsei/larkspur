import C from '../src/factory.ts';
import { localBin, run } from './helpers.ts';

export default C(
  'Build Larkspur',
  async () => run(localBin('tsdown'))
);
