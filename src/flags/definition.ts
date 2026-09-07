import type { Flag, Flags } from './types.ts';

/**
 * Treat an input value as a CLI flag
 */
export function useFlag<T extends Flag>(value: T): T {
  return value;
}

/**
 * Treat an input value as a map of CLI flags
 */
export function useFlags<T extends Flags>(value: T): T {
  return value;
}
