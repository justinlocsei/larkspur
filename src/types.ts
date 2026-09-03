import type { Config } from './types/config.js';

export type { Config };

/**
 * Metadata for a CLI
 */
export type Metadata = {
  description?: string;
  name: string;
};

/**
 * The execution context for a CLI
 */
export type Context = {
  config: Config;
  meta: Metadata;
};

/**
 * A generic shape for environment variables
 */
export type EnvironmentVariables = Record<string, string | undefined>;
