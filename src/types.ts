/**
 * Metadata for a CLI
 */
export type Metadata = {
  description?: string;
  name: string;
};

export const COMPLETION_SHELLS = ['bash'] as const;

/**
 * Shells that support completions
 */
export type CompletionShell = (typeof COMPLETION_SHELLS)[number];
