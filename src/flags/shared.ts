import type { Config } from '../types/config.ts';
import type { Flags } from './types.ts';

/**
 * All shared flags
 */
export type SharedFlags = Flags;

/**
 * Use shared flags based on the given configuration
 */
export function useSharedFlags(config: Config): Flags {
  const flags: Flags = {
    help: {
      default: false,
      description: 'Show help',
      type: 'boolean'
    }
  };

  const explore = getExploreFlagName(config);

  if (explore) {
    flags[explore] = {
      default: false,
      description: 'Recursively list commands and flags',
      type: 'boolean'
    };
  }

  return flags;
}

/**
 * Get the configured name of the explore flag
 */
export function getExploreFlagName(
  { help: { explore } }: Config
): string | undefined {
  return explore.enabled
    ? explore.flag
    : undefined;
}
