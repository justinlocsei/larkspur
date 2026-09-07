// biome-ignore-all lint/suspicious/noTemplateCurlyInString: zsh variables are intentional

import { assert } from 'vitest';

import { quote } from '../../../src/completions/scripts.js';
import type { CompletionsTester } from './completions.js';

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Render a single zpty driver that loads completions and captures compadd results
 */
function renderHarness(
  completionPath: string,
  cliName: string,
  inputs: string[],
  preamble: string[]
): string {
  const input = [cliName, ...inputs].join(' ');

  return [
    'emulate -L zsh',
    'zmodload zsh/zpty',
    ...preamble,
    `session=$(mktemp)`,
    `cat > "$session" <<'SESSION'`,
    'emulate -L zsh',
    'autoload -Uz compinit',
    'compinit -C -D',
    `source ${quote(completionPath)}`,
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
    'vared -c tmp',
    'SESSION',
    'zpty -d pty 2>/dev/null',
    'zpty -b pty zsh -f "$session"',
    "zpty -r pty boot '*ready*' || exit 1",
    `zpty -w pty ${quote(input)}$'\\t'`,
    "zpty -r pty output $'*\\C-C*' || exit 1",
    'zpty -d pty',
    'rm -f "$session"',
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
 * Request completions for a set of inputs from zsh
 */
export const runZshCompletions: CompletionsTester = async (run) => {
  const { cliName, dir, inputs } = run;

  const completionPath = path.join(dir, 'completion.zsh');
  const harnessPath = path.join(dir, 'harness.zsh');

  await fs.writeFile(
    completionPath,
    run.script
  );

  await fs.writeFile(
    harnessPath,
    renderHarness(completionPath, cliName, inputs, run.preamble)
  );

  const { status, stderr, stdout } = spawnSync(
    'zsh',
    [harnessPath],
    { encoding: 'utf8' }
  );

  assert.equal(
    status,
    0,
    `zsh completions failed: ${inputs.join(' ')}\n${stderr}`
  );

  return parseZshCompletionReply(stdout);
};
