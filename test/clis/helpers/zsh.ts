// biome-ignore-all lint/suspicious/noTemplateCurlyInString: zsh variables are intentional

import { assert } from 'vitest';

import { quote } from '../../../src/completions/scripts.ts';
import type { CompletionsTester } from './completions.ts';

import type { SpawnSyncReturns } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

// Sentinel bytes used by the harness
const STX = '\u0002';
const ETX = '\u0003';

/**
 * Express a byte as a zsh $ literal
 */
function zshByte(char: string): string {
  const hex = char
    .charCodeAt(0)
    .toString(16)
    .padStart(2, '0');

  return `$'\\x${hex}'`;
}

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
  const booted = 'harness-ready';

  return `
# Establish a pseudo-terminal for test execution
set -e
emulate -L zsh
export TERM=xterm
zmodload zsh/zpty
${preamble.join('\n')}

# Write a session script that will run in the pty
session=$(mktemp)
cat > "$session" <<'SESSION'

# Load the completion system and the completion script under test
export TERM=xterm
emulate -L zsh
autoload -Uz compinit
compinit -C -D
source ${quote(completionPath)}

# Intercept compadd to read the suggested completions
typeset -aU completions=()
compadd() {
  local -a reply
  builtin compadd -A reply "$@"
  completions+=("\${reply[@]}")
}

# Replace tab with a widget that captures and prints completions
capture-output() {
  unset 'compstate[vared]'
  _main_complete
  print -n ${zshByte(STX)}
  print -nlr -- "$completions[@]"
  print -n ${zshByte(ETX)}
  zle -M done
}
zle -C capture-output complete-word capture-output
bindkey '^I' capture-output

# Signal that boot has completed and block on a line editor so tab has a
# buffer to complete
print -n ${booted}
vared -c tmp
SESSION

# Start zsh with a pty, wait for boot, type the partial command, hit tab,
# then read output until the widget prints the closing delimiter
zpty -d pty 2>/dev/null
zpty -b pty zsh -fi "$session"
zpty -r pty boot '*${booted}*' || exit 1
zpty -w pty ${quote(input)}$'\\t'
zpty -r pty output $'*${ETX}*' || exit 1
zpty -d pty
rm -f "$session"
print -r -- "$output"
  `.trim();
}

/**
 * Run a zsh harness script in an environment suitable for zpty
 */
function runHarness(
  harnessPath: string,
  cwd: string
): SpawnSyncReturns<string> {
  const args = process.platform === 'darwin'
    ? ['-q', '/dev/null', 'zsh', harnessPath]
    : ['-q', '-c', `exec zsh ${quote(harnessPath)}`, '/dev/null'];

  return spawnSync('script', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, TERM: 'xterm' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

/**
 * Extract completions from the harness's output
 */
function parseZshCompletionReply(output: string): string[] {
  const start = output.indexOf(STX);
  const end = output.indexOf(ETX, start + 1);

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
  const { cliName, rootDir, inputs } = run;

  const completionPath = path.join(rootDir, 'completion.zsh');
  const harnessPath = path.join(rootDir, 'harness.zsh');

  await fs.writeFile(
    completionPath,
    run.script
  );

  await fs.writeFile(
    harnessPath,
    renderHarness(completionPath, cliName, inputs, run.preamble)
  );

  const { status, stderr, stdout } = runHarness(harnessPath, run.runDir);

  assert.equal(
    status,
    0,
    `zsh completions failed: ${inputs.join(' ')}\n${stderr}`
  );

  return parseZshCompletionReply(stdout);
};
