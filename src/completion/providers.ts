import type { CompletionProvider, CompletionSource } from './provider.js';
import { BashCompletionProvider } from './providers/bash.js';

export type { CompletionSource };

/**
 * A shell for which completions can be generated
 */
export type SupportedShell = 'bash';

/**
 * Create a completion provider for a supported shell
 */
export function loadProvider(
  shell: SupportedShell,
  cli: CompletionSource
): CompletionProvider {
  switch (shell) {
    case 'bash':
      return new BashCompletionProvider(cli);
  }
}
