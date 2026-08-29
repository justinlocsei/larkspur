import type { CompletionSource } from './completion/providers.js';
import { loadProvider } from './completion/providers.js';
import type { SupportedShell } from './types.js';

/**
 * Build shell-specific completions for a CLI
 */
export function buildCompletions(
  shell: SupportedShell,
  cli: CompletionSource
): string {
  return loadProvider(shell, cli).buildScript().script;
}
