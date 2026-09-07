import { useFlags } from './definition.ts';
import type { Flags } from './types.ts';

// Flags available to all commands in a tree
const GLOBAL_FLAGS = useFlags({
  help: {
    default: false,
    description: 'Show help',
    type: 'boolean'
  }
});

/**
 * All shared flags
 */
export type SharedFlags = typeof GLOBAL_FLAGS;

/**
 * Use shared flags
 */
export function useSharedFlags(): Flags {
  return GLOBAL_FLAGS;
}
