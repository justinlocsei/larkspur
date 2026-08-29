import type { CompletionSource } from './completion/providers.js';
import { loadProvider } from './completion/providers.js';
import type { CompletionShell } from './types.js';

/**
 * Build shell-specific completions for a CLI
 */
export function buildCompletions(
  shell: CompletionShell,
  cli: CompletionSource
): string {
  return loadProvider(shell, cli).buildScript().script;
}
