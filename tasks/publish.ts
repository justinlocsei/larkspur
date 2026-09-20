import C from '../src/factory.ts';
import {
  runPreflightChecks,
  verifyPublishedPackage
} from './helpers/publish.ts';
import { buildReleaseNotes, updateChangelog } from './helpers/release.ts';
import { completeVersions } from './helpers/versions.ts';

const version = C.flag('string', 'A version number', {
  completion: completeVersions,
  required: true
});

export default C.group('Manage package publishing', {
  changelog: C(
    'Generate a changelog section for a version',
    { version },
    flags => updateChangelog(flags.version)
  ),

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
