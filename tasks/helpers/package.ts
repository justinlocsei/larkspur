import { OperationalError } from '../../src/errors.ts';
import { useTempDir } from '../../src/tests.ts';
import { build } from '../build.ts';
import { captureOutput, showOutput } from './commands.ts';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONSUMER_PROJECT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'consumer-test'
);

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
 * Run the consumer test code against the local Larkspur package
 */
function testConsumer(consumerDir: string): void {
  const { stdout, stderr } = captureOutput(
    process.execPath,
    ['cli.mjs', 'check'],
    { cwd: consumerDir }
  );

  if (!stdout.includes('success')) {
    throw new OperationalError(
      'The consumer produced incorrect output:',
      [stdout, stderr].map(Boolean).join('\n')
    );
  }
}

/**
 * Verify that Larkspur can be packed and consumed from a tarball
 */
export function verifyPackage(): Promise<void> {
  const showSection = (
    label: string,
    { first = false, trailing = true } = {}
  ) => {
    console.log(`${first ? '' : '\n'}${label}${trailing ? '\n' : ''}`);
  };

  return useTempDir(async packDir => {
    showSection('# Build', { first: true });

    build();

    showSection('# Package');

    showOutput('npm', [
      'pack',
      '--pack-destination',
      packDir,
      '--quiet'
    ]);

    const consumerDir = path.join(
      packDir,
      path.basename(CONSUMER_PROJECT)
    );

    await fs.mkdir(consumerDir);
    await fs.cp(CONSUMER_PROJECT, consumerDir, { recursive: true });

    showSection('# Install', { trailing: false });

    showOutput(
      'npm',
      ['install', '--quiet', await findPackedTarball(packDir)],
      { cwd: consumerDir, env: process.env }
    );

    showSection('# Verify');

    await checkForSourceMaps(consumerDir);
    testConsumer(consumerDir);

    console.log('Package verified');
  });
}
