import type { DeepPartial } from './utils.ts';

/**
 * Configuration for help messages
 */
export type HelpConfig = {
  explore: ExploreConfig;
  indent: number;
};

/**
 * Configuration for exploratory CLI output
 */
export type ExploreConfig = {
  enabled: boolean;
  flag: string;
};

/**
 * Configuration for shell completions
 */
export type CompletionConfig = {
  enabled: boolean;
  group: string;
};

/**
 * Fully populated configuration data for a CLI
 */
export type Config = {
  completions: CompletionConfig;
  help: HelpConfig;
};

/**
 * User-provided configuration data
 */
export type UserConfig = DeepPartial<Config>;
