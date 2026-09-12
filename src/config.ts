import type {
  CompletionConfig,
  Config,
  ExploreConfig,
  HelpConfig,
  UserConfig
} from './types/config.ts';
import { isValidCommandName } from './validation.ts';

/**
 * Build a full configuration object from user data
 */
export function resolveConfig(config: UserConfig = {}): Config {
  return {
    completions: resolveCompletionConfig(config),
    explore: resolveExploreConfig(config.explore),
    help: resolveHelpConfig(config)
  };
}

/**
 * Resolve the help configuration
 */
function resolveHelpConfig(user: UserConfig): HelpConfig {
  const { help: { indent = 2 } = {} } = user;

  return {
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
    command = 'explore',
    enabled = true
  } = user;

  if (!isValidCommandName(command)) {
    throw new Error(`Invalid name for the explore command: ${command}`);
  }

  return {
    command,
    enabled
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
