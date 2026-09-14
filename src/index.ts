import factory from './factory.ts';

export { run } from './cli.ts';
export type {
  Command,
  CommandGroup,
  CommandHandler,
  CommandTree
} from './commands/types.ts';
export { OperationalError } from './errors.ts';
export type { Flag, Flags } from './flags/types.ts';

import type { Flags } from './flags/types.ts';
import type { ValuesOf as RawValuesOf } from './flags/values.ts';

/**
 * Get the parsed values for a set of flags
 */
export type ValuesOf<T extends Flags> = RawValuesOf<T, 'narrow'>;

export default factory;
