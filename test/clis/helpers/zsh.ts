// biome-ignore-all lint/suspicious/noTemplateCurlyInString: zsh variables are intentional

import { assert } from 'vitest';

import { createNameGenerator } from '../../../src/completions/fns.js';
import { quote } from '../../../src/completions/scripts.js';
import { useTempDir } from '../../../src/tests.js';

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Render the text of a script to establish a pseudo-interactive session
 */
function renderSession(scriptPath: string, entryPoint: string): string {
  return [
    'emulate -L zsh',
    `source ${quote(scriptPath)}`,
    `compdef ${entryPoint} completions`,
    'typeset -aU completions=()',
    'compadd() {',
    '  local -a reply',
    '  builtin compadd -A reply "$@"',
    '  completions+=("${reply[@]}")',
    '}',
    'poc-widget() {',
    "  unset 'compstate[vared]'",
    '  _main_complete',
    "  print -n $'\\C-B'",
    '  print -nlr -- "$completions[@]"',
    "  print -n $'\\C-C'",
    '  zle -M done',
    '}',
    'zle -C poc-widget complete-word poc-widget',
    "bindkey '^I' poc-widget",
    'print -n ready',
    'vared -c tmp'
  ].join('\n');
}

/**
 * Render a script to drive a pseudo-interactive session
 */
function renderDriver(
  sessionPath: string,
  cliName: string,
  inputs: string[],
  preamble: string[]
): string {
  const input = [cliName, ...inputs].join(' ');

  return [
    'emulate -L zsh',
    ...preamble,
    'zmodload zsh/zpty',
    `zpty pty zsh -f ${quote(sessionPath)}`,
    "zpty -r pty boot '*ready*' || exit 1",
    `zpty -w pty ${quote(input)}$'\\t'`,
    "zpty -r pty output $'*\\C-C*' || exit 1",
    'zpty -d pty',
    'print -r -- "$output"'
  ].join('\n');
}

/**
 * Extract completions from the harness's output
 */
function parseZshCompletionReply(output: string): string[] {
  const start = output.indexOf('\u0002');
  const end = output.indexOf('\u0003', start + 1);

  if (start < 0 || end < 0) {
    return [];
  }

  return output
    .slice(start + 1, end)
    .replace(/\r/g, '')
    .split('\n')
    .filter(Boolean);
}

/**
 * Request completions for a set of inputs from bash
 */
export async function runZshCompletions({
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
    const entryPoint = createNameGenerator(cliName)('entry');
    const lines = script.split('\n');

    if (lines[0]?.startsWith('#compdef')) {
      lines.shift();
    }

    const entryIndex = lines.findLastIndex(line => line.match(/^(\S+) "\$@"$/));

    if (entryIndex >= 0) {
      lines.splice(entryIndex, 1);
    }

    const scriptPath = path.join(dir, 'completion.zsh');
    const sessionPath = path.join(dir, 'session.zsh');
    const driverPath = path.join(dir, 'driver.zsh');

    await fs.writeFile(scriptPath, lines.join('\n'));

    await fs.writeFile(
      sessionPath,
      [
        'emulate -L zsh',
        'autoload -Uz compinit',
        'compinit -C -D',
        renderSession(scriptPath, entryPoint)
      ].join('\n')
    );

    await fs.writeFile(
      driverPath,
      renderDriver(sessionPath, cliName, inputs, preamble)
    );

    const { status, stderr, stdout } = spawnSync('zsh', [driverPath], {
      encoding: 'utf8',
      timeout: 10_000
    });

    assert.equal(
      status,
      0,
      `zsh completions failed: ${inputs.join(' ')}\n${stderr}`
    );

    return parseZshCompletionReply(stdout);
  });
}
