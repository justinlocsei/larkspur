import { OperationalError } from '../../src/errors.ts';
import { useTempDir } from '../../src/tests.ts';
import { build } from '../build.ts';
import { showOutput } from './commands.ts';
import { prepareConsumerDir, testConsumer } from './consumer-project.ts';

import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCEMAP_REFERENCE = /sourceMappingURL=/;

/**
 * Find the tarball produced by npm pack
 */
async function findPackedTarball(packDir: string): Promise<string> {
  const tarball = (await fs.readdir(packDir)).find(file =>
    file.endsWith('.tgz')
  );

  if (!tarball) {
    throw new OperationalError(`No tarball found in ${packDir}`);
  }

  return path.join(packDir, tarball);
}

/**
 * Verify that the installed package excludes source maps
 */
async function checkForSourceMaps(consumerDir: string): Promise<void> {
  const packageDir = path.join(consumerDir, 'node_modules', 'larkspur');

  const files = await fs.readdir(packageDir, {
    encoding: 'utf8',
    recursive: true
  });

  const maps = files.filter(f => f.endsWith('.map'));

  if (maps.length > 0) {
    throw new OperationalError(
      'Installed package includes source maps:',
      maps.join('\n')
    );
  }

  for (const file of files.filter(f => f.endsWith('.mjs'))) {
    const content = await fs.readFile(path.join(packageDir, file), 'utf8');

    if (SOURCEMAP_REFERENCE.test(content)) {
      throw new OperationalError('File references a source map:', file);
    }
  }
}

/**
 * Show a section heading
 */
function showSection(
  label: string,
  { first = false, trailing = true } = {}
): void {
  console.log(`${first ? '' : '\n'}# ${label}${trailing ? '\n' : ''}`);
}

/**
 * Install a package in the consumer project and verify it
 */
async function verifyPackage(parentDir: string, spec: string): Promise<void> {
  const consumerDir = prepareConsumerDir(parentDir);

  showSection('Install', { trailing: false });

  showOutput(
    'npm',
    ['install', '--quiet', spec],
    { cwd: consumerDir }
  );

  showSection('Verify');

  await checkForSourceMaps(consumerDir);

  testConsumer(consumerDir);
}

/**
 * Verify that Larkspur can be packed and consumed from a tarball
 */
export function runPreflightChecks(): Promise<void> {
  return useTempDir(async packDir => {
    showSection('Build', { first: true });

    build();

    showSection('Package');

    showOutput('npm', [
      'pack',
      '--pack-destination',
      packDir,
      '--quiet'
    ]);

    await verifyPackage(packDir, await findPackedTarball(packDir));

    console.log('\nPreflight checks passed');
  });
}

/**
 * Verify a published Larkspur version from npm
 */
export function verifyPublishedPackage(version: string): Promise<void> {
  return useTempDir(async workDir => {
    const spec = `larkspur@${version}`;

    showSection('Registry', { first: true });

    showOutput('npm', ['view', spec, 'version']);

    await verifyPackage(workDir, spec);

    console.log(`Published ${spec} verified`);
  });
}
