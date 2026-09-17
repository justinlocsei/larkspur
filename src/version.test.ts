import { assert, describe, it } from 'vitest';

import { ensure, useTempDir } from './tests.ts';
import { resolveVersion } from './version.ts';

import fs from 'node:fs/promises';
import path from 'node:path';

async function linkTo(target: string, linkPath: string): Promise<void> {
  await fs.symlink(target, linkPath, 'file');
}

async function writePackageVersion(
  dir: string,
  version: string
): Promise<void> {
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ version })
  );
}

describe('resolveVersion', () => {
  it('directly returns a string version', async () => {
    assert.equal(await resolveVersion('1.2.3'), '1.2.3');
  });

  it('supports functional version providers', async () => {
    assert.equal(await resolveVersion(() => '1.0.0'), '1.0.0');
    assert.equal(await resolveVersion(async () => '2.0.0'), '2.0.0');
  });

  it('exposes the absolute path to the entry file', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');
      await fs.writeFile(scriptPath, '');

      const script = await resolveVersion(
        c => c.getEntryFile(),
        scriptPath
      );

      assert.equal(script, scriptPath);
    });
  });

  it('follows symlinks when resolving the entry file', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');
      const linkPath = path.join(dir, 'linked.mjs');

      await fs.writeFile(scriptPath, '');
      await linkTo(scriptPath, linkPath);

      const script = await resolveVersion(
        c => c.getEntryFile(),
        linkPath
      );

      assert.equal(script, scriptPath);
    });
  });

  it('does not resolve the entry file unless the provider uses it', async () => {
    await useTempDir(async dir => {
      const linkPath = path.join(dir, 'linked.mjs');

      await linkTo(path.join(dir, 'missing.mjs'), linkPath);

      assert.equal(
        await resolveVersion(async () => '1.0.0', linkPath),
        '1.0.0'
      );
    });
  });

  it('lazily resolves the entry file', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');
      const linkPath = path.join(dir, 'linked.mjs');

      await linkTo(scriptPath, linkPath);

      const script = await resolveVersion(async ({ getEntryFile }) => {
        await fs.writeFile(scriptPath, '');

        return getEntryFile();
      }, linkPath);

      assert.equal(script, scriptPath);
    });
  });

  it('throws when entry resolution is performed without a file', async () => {
    await ensure.rejects(
      () => resolveVersion(c => c.getEntryFile()),
      'No entry file was provided'
    );
  });

  it('throws when entry resolution fails', async () => {
    await useTempDir(async dir => {
      await ensure.rejects(
        () =>
          resolveVersion(
            c => c.getEntryFile(),
            path.join(dir, 'missing.mjs')
          ),
        'missing.mjs'
      );
    });
  });

  it('can read the version from the nearest package.json file', async () => {
    await useTempDir(async dir => {
      const appDir = path.join(dir, 'app');
      const scriptPath = path.join(appDir, 'bin', 'cli.mjs');

      await fs.mkdir(path.join(appDir, 'bin'), { recursive: true });
      await fs.writeFile(scriptPath, '');

      await writePackageVersion(dir, '9.9.9');
      await writePackageVersion(appDir, '1.0.0');

      assert.equal(
        await resolveVersion(c => c.getPackageVersion(), scriptPath),
        '1.0.0'
      );
    });
  });

  it('does not read package.json unless the provider uses it', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');

      await fs.writeFile(scriptPath, '');

      assert.equal(
        await resolveVersion(async () => '1.0.0', scriptPath),
        '1.0.0'
      );
    });
  });

  it('lazily reads the package version', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');

      await fs.writeFile(scriptPath, '');

      const version = await resolveVersion(async ({ getPackageVersion }) => {
        await writePackageVersion(dir, '2.0.0');

        return getPackageVersion();
      }, scriptPath);

      assert.equal(version, '2.0.0');
    });
  });

  it('throws when no package.json is found', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');

      await fs.writeFile(scriptPath, '');

      await ensure.rejects(
        () => resolveVersion(c => c.getPackageVersion(), scriptPath),
        'No package.json was found'
      );
    });
  });

  it('throws when package.json cannot be parsed', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');

      await fs.writeFile(scriptPath, '');
      await fs.writeFile(path.join(dir, 'package.json'), '{');

      await ensure.rejects(
        () => resolveVersion(c => c.getPackageVersion(), scriptPath),
        'Could not parse package.json'
      );
    });
  });

  it('throws when package.json does not define a version', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');

      await fs.writeFile(scriptPath, '');

      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'example' })
      );

      await ensure.rejects(
        () => resolveVersion(c => c.getPackageVersion(), scriptPath),
        'Could not read a version from package.json'
      );
    });
  });
});
