import type { DeepPartial } from './utils.js';

/**
 * Formatting options for help messages
 */
export type HelpFormatting = {
  gutter: number;
  indent: number;
};

/**
 * Configuration for help messages
 */
export type HelpConfig = {
  formatting: HelpFormatting;
};

/**
 * Configuration for shell completions
 */
export type CompletionConfig = {
  enabled: boolean;
};

/**
 * Fully populated configuration data for a CLI
 */
export type Config = {
  completion: CompletionConfig;
  help: HelpConfig;
};

/**
 * User-provided configuration data
 */
export type UserConfig = DeepPartial<Config>;
