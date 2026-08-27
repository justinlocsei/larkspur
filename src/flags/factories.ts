import type { Select, Subset } from '../types/utils.js';
import type { Flag, FlagOfType, StringFlag } from './types.js';
import type { SpecificValueOf } from './values.js';

/**
 * Core flag fields for factory requests
 */
type CoreFields = Select<keyof Flag, 'description' | 'type'>;

/**
 * The types of flags that lack the ability to be narrowly specified
 */
type SimpleFlagType = Exclude<Flag['type'], 'string'>;

/**
 * Determine the options for a flag of a given type
 */
type FlagOptions<T extends Flag['type']> = Omit<FlagOfType<T>, CoreFields>;

/**
 * Define a string flag built by the factory
 */
type FactoryStringFlag<O> =
  & StringFlag<SpecificValueOf<Subset<StringFlag, CoreFields> & O>>
  & O;

/**
 * Build a command flag
 */
export function buildFlag<T extends SimpleFlagType>(
  type: T,
  description: string
): FlagOfType<T>;
export function buildFlag<T extends SimpleFlagType, O extends FlagOptions<T>>(
  type: T,
  description: string,
  options: FlagOptions<T> & O
): FlagOfType<T> & O;
export function buildFlag<O extends FlagOptions<'string'>>(
  type: 'string',
  description: string,
  options?: FlagOptions<'string'> & O
): FactoryStringFlag<O>;
export function buildFlag(
  type: Flag['type'],
  description: string,
  options?: FlagOptions<Flag['type']>
): Flag {
  return { description, type, ...options } as Flag;
}
