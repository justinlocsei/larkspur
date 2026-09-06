// biome-ignore-all lint/suspicious/noTemplateCurlyInString: bash variables are intentional

import { assert } from 'vitest';

import { createNameGenerator } from '../../../src/completions/fns.js';
import { quote } from '../../../src/completions/scripts.js';
import { useTempDir } from '../../../src/tests.js';

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Request completions for a set of inputs from bash
 */
export async function runBashCompletions({
  cliName,
  inputs,
  prepareDir,
  script
}: {
  cliName: string;
  inputs: string[];
  prepareDir: (dir: string) => Promise<{ preamble?: string[] }>;
  script: string;
}): Promise<string[]> {
  return useTempDir(async dir => {
    const { preamble = [] } = await prepareDir(dir);
    const args = [cliName, ...inputs];

    const words = args
      .filter(arg => arg !== ' ')
      .map(quote)
      .join(' ');

    const harness = [
      ...preamble,
      script,
      `COMP_CWORD=${args.length - 1}`,
      `COMP_LINE=${quote(args.join(' '))}`,
      `COMP_WORDS=(${words})`,
      inputs.at(-1) === ' ' ? 'COMP_WORDS+=("")' : '',
      createNameGenerator(cliName)('entry'),
      'printf "%s\\n" "${COMPREPLY[@]}"'
    ].join('\n');

    const harnessPath = path.join(dir, 'harness.sh');
    await fs.writeFile(harnessPath, harness);

    const { status, stderr, stdout } = spawnSync('bash', [harnessPath], {
      encoding: 'utf8'
    });

    assert.equal(
      status,
      0,
      `bash completions failed: ${inputs.join(' ')}\n${stderr}`
    );

    return stdout
      .trim()
      .split('\n')
      .filter(Boolean);
  });
}
