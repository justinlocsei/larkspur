import type { CompletionProvider, CompletionSource } from './provider.js';
import { BashCompletionProvider } from './providers/bash.js';

export type { CompletionSource };

export const SUPPORTED_SHELLS = ['bash'] as const;

/**
 * A shell for which completions can be generated
 */
export type SupportedShell = (typeof SUPPORTED_SHELLS)[number];

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
