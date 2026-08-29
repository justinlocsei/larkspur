/**
 * Metadata for a CLI
 */
export type CLIMetadata = {
  description?: string;
  name: string;
};

export const SUPPORTED_SHELLS = ['bash'] as const;

/**
 * A supported shell
 */
export type SupportedShell = (typeof SUPPORTED_SHELLS)[number];
