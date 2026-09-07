export const SUPPORTED_SHELLS = ['bash', 'zsh'] as const;

/**
 * Shells that support completions
 */
export type SupportedShell = (typeof SUPPORTED_SHELLS)[number];

/**
 * Information about a supported shell
 */
type ShellMetadata = {
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
    profiles: ['~/.bashrc', '~/.bash_profile'],
    signature: 'COMPREPLY'
  },
  zsh: {
    profiles: ['~/.zshrc'],
    signature: '#compdef'
  }
};

/**
 * Get metadata for a supported shell
 */
export function getShellMetadata(shell: SupportedShell): ShellMetadata {
  return SHELL_METADATA[shell];
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
