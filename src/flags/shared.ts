import type { Config, Context } from '../types.ts';
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
 * Produce shared flags available to every command
 */
export function useSharedFlags(_: Config): Flags {
  return { ...STATIC_FLAGS };
}

/**
 * Produce shared flags available only at the root
 */
export function useSharedRootFlags(context: Context): Flags {
  const flags = useSharedFlags(context.config);

  if (context.meta.version !== undefined) {
    flags.version = ROOT_FLAGS.version;
  }

  return flags;
}

/**
 * Get the names of flags that are reserved for internal use
 */
export function getReservedFlagNames(config: Config): string[] {
  return Object.keys(useSharedFlags(config)).sort();
}
