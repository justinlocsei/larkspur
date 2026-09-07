import type { SupportedShell } from '../../../src/completions/shells.ts';
import { runBashCompletions } from './bash.ts';
import type { CompletionsTest, CompletionsTester } from './completions.ts';
import { testCompletions } from './completions.ts';
import { runZshCompletions } from './zsh.ts';

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
