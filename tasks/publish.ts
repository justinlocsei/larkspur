import C from '../src/factory.ts';
import {
  runPreflightChecks,
  verifyPublishedPackage
} from './helpers/publish.ts';
import { buildReleaseNotes } from './helpers/release.ts';

const version = C.flag('string', 'A version number', { required: true });

export default C.group('Manage package publishing', {
  preflight: C(
    'Verify that the package can be built and installed',
    runPreflightChecks
  ),

  'release-notes': C(
    'Build release notes for a version',
    { version },
    flags => buildReleaseNotes(flags.version)
  ),

  verify: C(
    'Verify a published Larkspur version',
    { version },
    flags => verifyPublishedPackage(flags.version)
  )
});
