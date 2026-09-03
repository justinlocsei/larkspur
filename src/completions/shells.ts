export const SUPPORTED_SHELLS = ['bash'] as const;

/**
 * Shells that support completions
 */
export type SupportedShell = (typeof SUPPORTED_SHELLS)[number];
