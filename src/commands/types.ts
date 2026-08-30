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
  F extends Flags = Flags,
  C extends FlagContext = 'narrow'
> = IsCommand<'handler', {
  flags?: F;
  handler: CommmandHandlerFn<F, C>;
}>;

/**
 * A command's handler function
 */
export type CommmandHandlerFn<
  F extends Flags = Flags,
  C extends FlagContext = 'narrow'
> = (
  flags: ValuesOf<F, C>,
  details: CommandParsingDetails<F>
) => Promise<void>;

/**
 * A group of subcommands
 */
export type CommandGroup = IsCommand<'group', {
  subcommands: CommandTree;
}>;

/**
 * The widest shape for a command handler
 */
export type GenericCommandHandler = CommandHandler<Flags, 'wide'>;

/**
 * A command
 */
export type Command = GenericCommandHandler | CommandGroup;

/**
 * A tree of named commands
 */
export type CommandTree = Partial<Record<string, Command>>;

/**
 * An entry point for a CLI
 */
export type EntryPoint = CommandTree;

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
