import type { ProvidedFlagNames } from '../flags/parsing.ts';
import type { FlagContext, Flags } from '../flags/types.ts';
import type { ValuesOf } from '../flags/values.ts';
import type { Context } from '../types.ts';

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
  hidden?: true;
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
) => Promise<string> | Promise<void>;

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
export type CommandTree<T extends string = string> = Partial<
  Record<T, Command>
>;

/**
 * A command tree with known commands
 */
export type KnownCommandTree<T extends string> = Required<CommandTree<T>>;

/**
 * An entry point for a CLI
 */
export type EntryPoint = CommandTree;

/**
 * Details on how a command was parsed
 */
export type CommandParsingDetails<T extends Flags = Flags> = {
  commands: CommandTree;
  context: Context;
  providedFlags: ProvidedFlagNames<T>;
};
