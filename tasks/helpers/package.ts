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
export function checkPackage(): Promise<void> {
  const showSection = (label: string) => {
    console.log(`${label}\n`);
  };

  return useTempDir(async packDir => {
    showSection('# Build');

    build();

    showSection('\n# Package');

    showOutput('npm', [
      'pack',
      '--pack-destination',
      packDir
    ]);

    const consumerDir = path.join(
      packDir,
      path.basename(CONSUMER_PROJECT)
    );

    await fs.mkdir(consumerDir);
    await fs.cp(CONSUMER_PROJECT, consumerDir, { recursive: true });

    showSection('\n# Install');

    showOutput(
      'npm',
      ['install', await findPackedTarball(packDir)],
      { cwd: consumerDir, env: process.env }
    );

    showSection('\n# Verify');

    testConsumer(consumerDir);

    console.log('Build verified');
  });
}
