import type { CompletionShell } from '../types.js';
import type { CompletionProvider, CompletionSource } from './provider.js';
import { BashCompletionProvider } from './providers/bash.js';

export type { CompletionSource };

/**
 * Build shell-specific completions for a CLI
 */
export function buildShellCompletions(
  shell: CompletionShell,
  cli: CompletionSource
): string {
  return loadProvider(shell, cli).buildScript().script;
}

/**
 * Create a completion provider for a supported shell
 */
function loadProvider(
  shell: CompletionShell,
  cli: CompletionSource
): CompletionProvider {
  switch (shell) {
    case 'bash':
      return new BashCompletionProvider(cli);
  }
}
