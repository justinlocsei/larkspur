import type {
  CompletionConfig,
  Config,
  ExploreConfig,
  HelpConfig,
  UserConfig
} from './types/config.ts';
import { isValidFlagName } from './validation.ts';

/**
 * Build a full configuration object from user data
 */
export function resolveConfig(config: UserConfig = {}): Config {
  return {
    completions: resolveCompletionConfig(config),
    help: resolveHelpConfig(config)
  };
}

/**
 * Resolve the help configuration
 */
function resolveHelpConfig(user: UserConfig): HelpConfig {
  const {
    help: {
      explore,
      indent = 2
    } = {}
  } = user;

  return {
    explore: resolveExploreConfig(explore),
    indent
  };
}

/**
 * Resolve the explore configuration
 */
function resolveExploreConfig(
  user: Partial<ExploreConfig> = {}
): ExploreConfig {
  const {
    enabled = true,
    flag = 'explore'
  } = user;

  if (!isValidFlagName(flag) || flag === 'help') {
    throw new Error(`Invalid name for the explore flag: ${flag}`);
  }

  return {
    enabled,
    flag
  };
}

/**
 * Resolve the completion configuration
 */
function resolveCompletionConfig(user: UserConfig): CompletionConfig {
  const {
    completions: {
      enabled = true,
      group = 'completions'
    } = {}
  } = user;

  return {
    enabled,
    group
  };
}
