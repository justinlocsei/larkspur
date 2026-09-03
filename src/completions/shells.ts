import type { EnvironmentVariables } from '../types.js';

export const SUPPORTED_SHELLS = ['bash'] as const;

/**
 * Shells that support completions
 */
export type SupportedShell = (typeof SUPPORTED_SHELLS)[number];

/**
 * Information about a supported shell
 */
type ShellMetadata = {
  environmentVariables: string[];
  profiles: string[];
};

const SHELL_METADATA: Record<SupportedShell, ShellMetadata> = {
  bash: {
    environmentVariables: ['BASH', 'BASH_VERSION'],
    profiles: ['~/.bashrc', '~/.bash_profile']
  }
};

export const SHELL_VARIABLES = SUPPORTED_SHELLS
  .flatMap((shell) => getShellMetadata(shell).environmentVariables)
  .sort();

/**
 * Get metadata for a supported shell
 */
export function getShellMetadata(shell: SupportedShell): ShellMetadata {
  return SHELL_METADATA[shell];
}

/**
 * Detect a supported shell from the environment
 */
export function detectShell(
  env: EnvironmentVariables
): SupportedShell | undefined {
  for (const shell of SUPPORTED_SHELLS) {
    const { environmentVariables } = getShellMetadata(shell);

    if (environmentVariables.some((name) => env[name] !== undefined)) {
      return shell;
    }
  }

  return undefined;
}
