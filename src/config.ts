import type {
  CompletionConfig,
  Config,
  HelpConfig,
  UserConfig
} from './types/config.ts';

/**
 * Build a full configuration object from user data
 */
export function resolveConfig(config: UserConfig = {}): Config {
  return {
    completion: resolveCompletionConfig(config),
    help: resolveHelpConfig(config)
  };
}

/**
 * Resolve the help configuration
 */
function resolveHelpConfig(user: UserConfig): HelpConfig {
  const {
    help: {
      formatting: {
        gutter = 2,
        indent = 2
      } = {}
    } = {}
  } = user;

  return {
    formatting: { gutter, indent }
  };
}

/**
 * Resolve the completion configuration
 */
function resolveCompletionConfig(user: UserConfig): CompletionConfig {
  const {
    completion: {
      enabled = true,
      group = 'completions'
    } = {}
  } = user;

  return {
    enabled,
    group
  };
}
