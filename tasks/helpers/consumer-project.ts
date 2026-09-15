import { OperationalError } from '../../src/errors.ts';
import { requireProperty } from '../../src/utils.ts';
import { captureOutput } from './commands.ts';
import { localFile } from './paths.ts';

import fs from 'node:fs';
import path from 'node:path';

const CLI_ENTRY = 'index.ts';
const CLI_TEMPLATE = localFile('tasks/helpers/consumer-project/cli.ts.txt');
const ROOT_TSCONFIG = 'larkspur-tsconfig.json';

/**
 * A subset of a package-lock.json file
 */
type Lockfile = { packages: Record<string, { version: string }> };

/**
 * Write a package manifest for the consumer project
 */
function writeConsumerPackageJson(consumerDir: string): void {
  const lockfile = JSON.parse(
    fs.readFileSync(localFile('package-lock.json'), 'utf8')
  ) as Lockfile;

  const manifest = {
    devDependencies: Object.fromEntries(
      ['@types/node', 'typescript'].map(n => [
        n,
        requireProperty(lockfile.packages, `node_modules/${n}`).version
      ])
    ),
    name: 'larkspur-consumer',
    private: true,
    type: 'module'
  };

  fs.writeFileSync(
    path.join(consumerDir, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

/**
 * Write a tsconfig for the consumer project
 */
function writeConsumerTsconfig(consumerDir: string): void {
  const tsconfig = {
    compilerOptions: { skipLibCheck: false },
    extends: `./${ROOT_TSCONFIG}`,
    include: [CLI_ENTRY]
  };

  fs.writeFileSync(
    path.join(consumerDir, 'tsconfig.json'),
    `${JSON.stringify(tsconfig, null, 2)}\n`
  );
}

/**
 * Generate a consumer project in a working directory
 */
export function prepareConsumerDir(parentDir: string): string {
  const consumerDir = path.join(parentDir, 'consumer-project');

  fs.mkdirSync(consumerDir, { recursive: true });

  fs.writeFileSync(
    path.join(consumerDir, CLI_ENTRY),
    fs.readFileSync(CLI_TEMPLATE, 'utf8')
  );

  fs.copyFileSync(
    localFile('tsconfig.json'),
    path.join(consumerDir, ROOT_TSCONFIG)
  );

  writeConsumerTsconfig(consumerDir);
  writeConsumerPackageJson(consumerDir);

  return consumerDir;
}

/**
 * Run smoke tests using the consumer project
 */
export function testConsumer(consumerDir: string): void {
  const verify = (check: string) => console.log(`[✔] ${check}`);

  const runCli = (args: string[]) =>
    captureOutput(
      process.execPath,
      ['--experimental-strip-types', CLI_ENTRY, ...args],
      { cwd: consumerDir }
    ).stdout;

  captureOutput('npm', ['exec', '--', 'tsc', '--noEmit'], { cwd: consumerDir });

  verify('Types');

  const help = runCli([
    'verify',
    'larkspur',
    'package',
    '--help'
  ]);

  if (!help.startsWith('Usage:')) {
    throw new OperationalError('Invalid help message', help);
  }

  verify('Help');

  const explore = runCli(['explore']);

  if (!explore.startsWith('$ ')) {
    throw new OperationalError('Invalid explore message', explore);
  }

  verify('Explore');

  runCli([
    'verify',
    'larkspur',
    'package',
    '--repeatable-string',
    'alfa',
    '--repeatable-string',
    'bravo',
    '--required-choice',
    'charlie'
  ]);

  verify('Commands');
}
