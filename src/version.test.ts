import { assert, describe, it } from 'vitest';

import { ensure, useTempDir } from './tests.ts';
import { resolveVersion } from './version.ts';

import fs from 'node:fs/promises';
import path from 'node:path';

async function linkTo(target: string, linkPath: string): Promise<void> {
  await fs.symlink(target, linkPath, 'file');
}

describe('resolveVersion', () => {
  it('directly returns a string version', async () => {
    assert.equal(await resolveVersion('1.2.3'), '1.2.3');
  });

  it('supports functional version providers', async () => {
    assert.equal(await resolveVersion(() => '1.0.0'), '1.0.0');
    assert.equal(await resolveVersion(async () => '2.0.0'), '2.0.0');
  });

  it('exposes the absolute path to the script file', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');
      await fs.writeFile(scriptPath, '');

      const script = await resolveVersion(
        c => c.getScriptFile(),
        scriptPath
      );

      assert.equal(script, scriptPath);
    });
  });

  it('follows symlinks when resolving the script file', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');
      const linkPath = path.join(dir, 'linked.mjs');

      await fs.writeFile(scriptPath, '');
      await linkTo(scriptPath, linkPath);

      const script = await resolveVersion(
        c => c.getScriptFile(),
        linkPath
      );

      assert.equal(script, scriptPath);
    });
  });

  it('exposes the absolute path to the script directory', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');
      await fs.writeFile(scriptPath, '');

      const scriptDir = await resolveVersion(
        ({ getScriptDir }) => getScriptDir(),
        scriptPath
      );

      assert.equal(scriptDir, dir);
    });
  });

  it('does not resolve the script file unless the provider uses it', async () => {
    await useTempDir(async dir => {
      const linkPath = path.join(dir, 'linked.mjs');

      await linkTo(path.join(dir, 'missing.mjs'), linkPath);

      assert.equal(
        await resolveVersion(async () => '1.0.0', linkPath),
        '1.0.0'
      );
    });
  });

  it('lazily resolves the script file', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');
      const linkPath = path.join(dir, 'linked.mjs');

      await linkTo(scriptPath, linkPath);

      const script = await resolveVersion(async ({ getScriptFile }) => {
        await fs.writeFile(scriptPath, '');

        return getScriptFile();
      }, linkPath);

      assert.equal(script, scriptPath);
    });
  });

  it('caches the resolved script file', async () => {
    await useTempDir(async dir => {
      const scriptPath = path.join(dir, 'cli.mjs');
      const linkPath = path.join(dir, 'linked.mjs');

      await fs.writeFile(scriptPath, '');
      await linkTo(scriptPath, linkPath);

      const version = await resolveVersion(async ({ getScriptFile }) => {
        const first = getScriptFile();

        await fs.unlink(scriptPath);

        assert.equal(getScriptFile(), first);

        return 'done';
      }, linkPath);

      assert.equal(version, 'done');
    });
  });

  it('throws when script resolution is performed without a file', async () => {
    await ensure.rejects(
      () => resolveVersion(c => c.getScriptFile()),
      'No script file was provided'
    );
  });

  it('throws when script resolution fails', async () => {
    await useTempDir(async dir => {
      await ensure.rejects(
        () =>
          resolveVersion(
            c => c.getScriptFile(),
            path.join(dir, 'missing.mjs')
          ),
        'missing.mjs'
      );
    });
  });
});
