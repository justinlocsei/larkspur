// biome-ignore-all lint/suspicious/noTemplateCurlyInString: bash variables are intentional

import { assert } from 'vitest';

import { BashCompletionProvider } from '../../../src/completions/providers/bash.ts';
import { quote } from '../../../src/completions/scripts.ts';
import type { CompletionsTester } from './completions.ts';

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Request completions for a set of inputs from bash
 */
export const runBashCompletions: CompletionsTester = async (run) => {
  const { cliName, inputs } = run;
  const args = [cliName, ...inputs];

  const words = args
    .filter(arg => arg !== ' ')
    .map(quote)
    .join(' ');

  const harness = [
    ...run.preamble,
    run.script,
    `COMP_CWORD=${args.length - 1}`,
    `COMP_LINE=${quote(args.join(' '))}`,
    `COMP_WORDS=(${words})`,
    inputs.at(-1) === ' ' ? 'COMP_WORDS+=("")' : '',
    BashCompletionProvider.createNameGenerator(cliName)('entry'),
    'printf "%s\\n" "${COMPREPLY[@]}"'
  ].join('\n');

  const harnessPath = path.join(run.dir, 'harness.sh');
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
};
