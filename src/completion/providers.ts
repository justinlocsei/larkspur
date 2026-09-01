import type { CompletionShell, EnvironmentVariables } from '../types.js';
import { COMPLETION_SHELLS } from '../types.js';
import type {
  CompletionProvider,
  CompletionProviderClass,
  CompletionSource
} from './provider.js';
import { BashCompletionProvider } from './providers/bash.js';

/**
 * An available completion provider
 */
type AvailableProvider = {
  environmentVariables: string[];
  profiles: string[];
  provider: CompletionProviderClass;
};

const PROVIDERS: Record<
  CompletionShell,
  AvailableProvider
> = {
  bash: {
    environmentVariables: ['BASH', 'BASH_VERSION'],
    profiles: ['~/.bashrc', '~/.bash_profile'],
    provider: BashCompletionProvider
  }
};

/**
 * Detect a supported shell from the environment
 */
export function detectShell(
  env: EnvironmentVariables
): CompletionShell | undefined {
  for (const shell of COMPLETION_SHELLS) {
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
export function getShellProfiles(shell: CompletionShell): string[] {
  return PROVIDERS[shell].profiles;
}

/**
 * Create a completion provider for a supported shell
 */
export function useProvider(
  shell: CompletionShell,
  cli: CompletionSource
): CompletionProvider {
  return new PROVIDERS[shell].provider(cli);
}
