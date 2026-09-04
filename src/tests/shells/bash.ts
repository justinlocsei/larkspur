// biome-ignore-all lint/suspicious/noTemplateCurlyInString: used for completion scripts

import { assert } from 'vitest';

import type { CompletionScript } from '../../completions/provider.js';
import { useTempDir } from '../../tests.js';
import { compact } from '../../utils.js';

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * The context for a completion test
 */
export type TestContext = {
  cwd?: string;
};

/**
 * Test returned bash completions
 */
export async function testBashCompletions({
  cliName,
  completion,
  context = {},
  inputs,
  prepareDir
}: {
  cliName: string;
  completion: CompletionScript<string>;
  context?: TestContext;
  inputs: string[];
  prepareDir?: (dir: string) => Promise<{ preamble?: string[] }>;
}): Promise<string[]> {
  return useTempDir(async dir => {
    const { preamble = [] } = await prepareDir?.(dir) ?? {};

    const harnessPath = path.join(dir, 'harness.sh');
    const args = [cliName, ...inputs];

    await fs.writeFile(
      harnessPath,
      [
        ...preamble,
        completion.script,
        `COMP_CWORD=${args.length - 1}`,
        `COMP_LINE="${args.join(' ')}"`,
        `COMP_WORDS=(${compact(args.map(arg => arg.trim())).join(' ')})`,
        inputs.at(-1) === ' ' ? 'COMP_WORDS+=("")' : '',
        completion.entryPoint,
        'printf \'%s\\0\' "${COMPREPLY[@]}"'
      ].filter(Boolean).join('\n')
    );

    const { status, stderr, stdout } = spawnSync('bash', [harnessPath], {
      cwd: context.cwd,
      stdio: 'pipe'
    });

    assert.equal(
      status,
      0,
      `bash completions failed: ${inputs.join(' ')}\n${stderr.toString()}`
    );

    return stdout
      .toString()
      .split('\0')
      .filter(Boolean);
  });
}
