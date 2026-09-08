import type { Exact } from '../types/utils.ts';
import type { Flag, FlagOfType, Flags } from './types.ts';

/**
 * Forbid unknown options for the given flag
 */
type StrictFlag<F extends Flag> = F extends
  { type: infer T extends Flag['type'] } ? Exact<FlagOfType<T>, F>
  : F;

/**
 * Ensure that each flag in a collection is strict
 */
type StrictFlags<F extends Flags> = {
  [K in keyof F]: StrictFlag<F[K]>;
};

/**
 * Treat an input value as a CLI flag
 */
export function useFlag<T extends Flag>(value: StrictFlag<T>): T {
  return value;
}

/**
 * Treat an input value as a map of CLI flags
 */
export function useFlags<T extends Flags>(value: StrictFlags<T>): T {
  return value;
}
