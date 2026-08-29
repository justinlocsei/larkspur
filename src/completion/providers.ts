import type { CompletionShell } from '../types.js';
import type { CompletionProvider, CompletionSource } from './provider.js';
import { BashCompletionProvider } from './providers/bash.js';

export type { CompletionSource };

/**
 * Create a completion provider for a supported shell
 */
export function loadProvider(
  shell: CompletionShell,
  cli: CompletionSource
): CompletionProvider {
  switch (shell) {
    case 'bash':
      return new BashCompletionProvider(cli);
  }
}
