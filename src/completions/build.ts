import type { CompletionSource } from './provider.js';
import { useProvider } from './providers.js';
import type { SupportedShell } from './shells.js';

/**
 * Build shell-specific completions for a CLI
 */
export function buildShellCompletions(
  shell: SupportedShell,
  cli: CompletionSource
): string {
  return useProvider(shell, cli).buildScript().script;
}

/**
 * Build installation instructions for shell completions
 */
export function buildInstallationInstructions(
  shell: SupportedShell,
  cli: CompletionSource
): string {
  return useProvider(shell, cli).buildInstallationInstructions();
}
