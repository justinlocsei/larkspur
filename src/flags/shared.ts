import type { Config } from '../types/config.ts';
import { useFlags } from './definition.ts';
import type { Flags } from './types.ts';

// Fixed flags available to all commands in a tree
const STATIC_FLAGS = useFlags({
  help: {
    default: false,
    description: 'Show help',
    type: 'boolean'
  }
});

/**
 * All shared flags
 */
export type SharedFlags = typeof STATIC_FLAGS;

/**
 * Use shared flags based on the given configuration
 */
export function useSharedFlags(_config: Config): Flags {
  return { ...STATIC_FLAGS };
}

/**
 * Get the names of flags that are reserved for internal use
 */
export function getReservedFlagNames(config: Config): string[] {
  return Object.keys(useSharedFlags(config)).sort();
}
