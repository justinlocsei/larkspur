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
  signature: string;
};

/**
 * An available shell with support for completions
 */
type AvailableShell = ShellMetadata & {
  name: SupportedShell;
};

const SHELL_METADATA: Record<SupportedShell, ShellMetadata> = {
  bash: {
    environmentVariables: ['BASH', 'BASH_VERSION'],
    profiles: ['~/.bashrc', '~/.bash_profile'],
    signature: 'COMPREPLY'
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

/**
 * List all available shells with support for completions
 */
export function listShells(): AvailableShell[] {
  return SUPPORTED_SHELLS.map((shell): AvailableShell => ({
    ...getShellMetadata(shell),
    name: shell
  }));
}
