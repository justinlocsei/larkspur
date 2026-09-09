import type { DeepPartial } from './utils.ts';

/**
 * Configuration for help messages
 */
export type HelpConfig = {
  indent: number;
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
