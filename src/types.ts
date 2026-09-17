import type { Config } from './types/config.ts';

export type { Config };

/**
 * A context available to functional version providers
 */
export type VersionContext = {
  getScriptDir(): string;
  getScriptFile(): string;
};

/**
 * A provider for a CLI's version
 */
export type VersionProvider =
  | string
  | ((context: VersionContext) => string | Promise<string>);

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
