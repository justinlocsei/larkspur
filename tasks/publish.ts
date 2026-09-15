import C from '../src/factory.ts';
import {
  runPreflightChecks,
  verifyPublishedPackage
} from './helpers/publish.ts';

export default C.group('Manage package publishing', {
  preflight: C(
    'Verify that the package can be built and installed',
    runPreflightChecks
  ),

  verify: C(
    'Verify a published Larkspur version',
    { version: C.flag('string', 'A published version', { required: true }) },
    flags => verifyPublishedPackage(flags.version)
  )
});
