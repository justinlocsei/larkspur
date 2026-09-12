import type { DeepPartial } from './utils.ts';

/**
 * Configuration for help messages
 */
export type HelpConfig = {
  indent: number;
};

/**
 * Configuration for exploratory CLI output
 */
export type ExploreConfig = {
  command: string;
  enabled: boolean;
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
  explore: ExploreConfig;
  help: HelpConfig;
};

/**
 * User-provided configuration data
 */
export type UserConfig = DeepPartial<Config>;
