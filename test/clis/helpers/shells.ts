import type { SupportedShell } from '../../../src/completions/shells.js';
import { runBashCompletions } from './bash.js';
import type { CompletionsTest, CompletionsTester } from './completions.js';
import { testCompletions } from './completions.js';
import { runZshCompletions } from './zsh.js';

/**
 * A test case for completions
 */
export type CompletionCase = [
  inputs: string[],
  outputs: string[]
];

/**
 * Run tests for shell completions
 */
export async function runShellCompletions(
  shell: SupportedShell,
  test: CompletionsTest
): Promise<string[]> {
  return testCompletions(test, selectCompletionsTester(shell));
}

/**
 * Select the completions tester for a given shell
 */
function selectCompletionsTester(shell: SupportedShell): CompletionsTester {
  switch (shell) {
    case 'bash':
      return runBashCompletions;

    case 'zsh':
      return runZshCompletions;
  }
}
