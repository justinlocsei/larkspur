import type { Context } from '../types.ts';
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

// Fixed flags available to the CLI root
const ROOT_FLAGS = useFlags({
  version: {
    default: false,
    description: 'Show the current version',
    type: 'boolean'
  }
});

/**
 * All shared flags
 */
export type SharedFlags = typeof STATIC_FLAGS & typeof ROOT_FLAGS;

/**
 * The scope at which shared flags are resolved
 */
export type SharedFlagsScope = 'global' | 'root';

/**
 * Produce shared flags for the given scope
 */
export function useSharedFlags(
  context: Context,
  scope: SharedFlagsScope
): Flags {
  const flags: Flags = { ...STATIC_FLAGS };

  if (scope === 'root' && context.meta.version !== undefined) {
    flags.version = ROOT_FLAGS.version;
  }

  return flags;
}

/**
 * Get the names of flags that are reserved for internal use
 */
export function getReservedFlagNames(context: Context): string[] {
  return Object.keys(useSharedFlags(context, 'global')).sort();
}
