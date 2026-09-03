import type { EnvironmentVariables } from '../types.js';
import type {
  CompletionProvider,
  CompletionProviderClass,
  CompletionSource
} from './provider.js';
import { BashCompletionProvider } from './providers/bash.js';
import type { SupportedShell } from './shells.js';
import { SUPPORTED_SHELLS } from './shells.js';

/**
 * An available completion provider
 */
type AvailableProvider = {
  environmentVariables: string[];
  profiles: string[];
  provider: CompletionProviderClass;
};

const PROVIDERS: Record<
  SupportedShell,
  AvailableProvider
> = {
  bash: {
    environmentVariables: ['BASH', 'BASH_VERSION'],
    profiles: ['~/.bashrc', '~/.bash_profile'],
    provider: BashCompletionProvider
  }
};

export const SHELL_VARIABLES = Object
  .entries(PROVIDERS)
  .flatMap(([_, p]) => p.environmentVariables)
  .sort();

/**
 * Detect a supported shell from the environment
 */
export function detectShell(
  env: EnvironmentVariables
): SupportedShell | undefined {
  for (const shell of SUPPORTED_SHELLS) {
    const { environmentVariables } = PROVIDERS[shell];

    if (environmentVariables.some((name) => env[name] !== undefined)) {
      return shell;
    }
  }

  return undefined;
}

/**
 * Get profile scripts for a supported shell
 */
export function getShellProfiles(shell: SupportedShell): string[] {
  return PROVIDERS[shell].profiles;
}

/**
 * Create a completion provider for a supported shell
 */
export function useProvider(
  shell: SupportedShell,
  cli: CompletionSource
): CompletionProvider {
  return new PROVIDERS[shell].provider(cli);
}
