import type { Config } from './types/config.ts';

export type { Config };

/**
 * A provider for a CLI's version string
 */
export type VersionProvider =
  | string
  | (() => string | Promise<string>);

/**
 * Metadata for a CLI
 */
export type Metadata = {
  description?: string;
  name: string;
  version?: VersionProvider;
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
