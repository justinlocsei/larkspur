import type { ProvidedFlagNames } from '../flags/parsing.js';
import type { FlagContext, Flags } from '../flags/types.js';
import type { ValuesOf } from '../flags/values.js';

/**
 * Define a command
 */
type IsCommand<T extends string, U> = U & {
  description: string;
  type: T;
};

/**
 * A command handler
 */
export type CommandHandler<
  TFlags extends Flags = Flags,
  TContext extends FlagContext = 'narrow'
> = IsCommand<'handler', {
  flags?: TFlags;
  handler: CommmandHandlerFn<TFlags, TContext>;
}>;

/**
 * A command's handler function
 */
export type CommmandHandlerFn<
  TFlags extends Flags = Flags,
  TContext extends FlagContext = 'narrow'
> = (
  flags: ValuesOf<TFlags, TContext>,
  details: CommandParsingDetails<TFlags>
) => Promise<void>;

/**
 * A group of subcommands
 */
export type CommandGroup = IsCommand<'group', {
  subcommands: CommandTree;
}>;

/**
 * A command
 */
export type Command = CommandHandler<Flags, 'wide'> | CommandGroup;

/**
 * A tree of named commands
 */
export type CommandTree = Partial<Record<string, Command>>;

/**
 * Details on how a command was parsed
 */
export type CommandParsingDetails<T extends Flags = Flags> = {
  args: ArgParsingDetails;
  commandPath: string[];
  providedFlags: ProvidedFlagNames<T>;
};

/**
 * Details on how a command's arguments were parsed
 */
export type ArgParsingDetails = {
  all: string[];
  extra: string[];
  parsed: string[];
};
