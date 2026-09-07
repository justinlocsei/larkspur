import type { Flags } from '../flags/types.ts';
import type { CommandGroup, CommandHandler } from './types.ts';

/**
 * A request for a command handler
 */
export type CommandHandlerRequest<T extends Flags> = Omit<
  CommandHandler<T, 'narrow'>,
  'type'
>;

/**
 * A generic definition of a command handler
 */
export type GenericCommandHandler = CommandHandler<Flags, 'wide'>;

/**
 * Define a command handler
 */
export function defineCommandHandler<T extends Flags>(
  command: CommandHandlerRequest<T>
): GenericCommandHandler {
  const narrow: CommandHandler<T, 'narrow'> = {
    ...command,
    type: 'handler'
  };

  return narrow as unknown as GenericCommandHandler;
}

/**
 * A request for a command group
 */
export type CommandGroupRequest = Omit<CommandGroup, 'type'>;

/**
 * Define a command group
 */
export function defineCommandGroup(group: CommandGroupRequest): CommandGroup {
  return { ...group, type: 'group' };
}
