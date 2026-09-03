import { formatList } from '../text.js';
import type { CompletionSource } from './provider.js';
import { getShellProfiles, useProvider } from './providers.js';
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
export function buildInstallInstructions(
  shell: SupportedShell,
  { context: { config, meta } }: CompletionSource
): string {
  return [
    `Add this line to your ${shell} profile (${
      formatList(getShellProfiles(shell), 'or')
    }):`,
    '',
    `  eval "$(${meta.name} ${config.completion.group} generate --shell ${shell})"`,
    '',
    'To use these completions, reload your profile or start a new shell.'
  ].join('\n');
}
