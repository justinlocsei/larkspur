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
export type { ValuesOf } from './flags/values.ts';

export default factory;
