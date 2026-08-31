import { COMPLETION_SHELLS } from '../types.js';
import { useFlags } from './definition.js';
import type { Flags } from './types.js';

// Flags available to all commands in a tree
export const GLOBAL_FLAGS = useFlags({
  help: {
    default: false,
    description: 'Show help',
    type: 'boolean'
  }
});

// Flags only available to the root command
export const ROOT_FLAGS = useFlags({
  complete: {
    choices: COMPLETION_SHELLS,
    description: 'Generate completions for the given shell',
    type: 'choice'
  }
});

export const SHARED_FLAGS = { ...GLOBAL_FLAGS, ...ROOT_FLAGS };

/**
 * All shared flags
 */
export type SharedFlags = typeof SHARED_FLAGS;

/**
 * Use shared flags appropriate to the given scope
 */
export function useSharedFlags(scope: 'nested' | 'root'): Flags {
  return scope === 'root' ? SHARED_FLAGS : GLOBAL_FLAGS;
}
