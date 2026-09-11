import C from '../src/factory.ts';
import { verifyPackage } from './helpers/package.ts';

export default C.group('Manage packaging', {
  verify: C('Verify that the package can be installed', verifyPackage)
});
