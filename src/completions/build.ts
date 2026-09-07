import type { CompletionSource } from './provider.ts';
import { useProvider } from './providers.ts';
import type { SupportedShell } from './shells.ts';

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
