/**
 * Metadata for a CLI
 */
export type CLIMetadata = {
  description?: string;
  name: string;
};

export const SUPPORTED_SHELLS = ['bash'] as const;

/**
 * A shell with full support for all Larkspur features
 */
export type SupportedShell = (typeof SUPPORTED_SHELLS)[number];
