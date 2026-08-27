import type { Flags } from '../flags/types.js';
import type { CommandGroup, CommandHandler } from './types.js';

/**
 * A request for a command handler
 */
export type CommandHandlerRequest<T extends Flags> = Omit<
  CommandHandler<T, 'narrow'>,
  'type'
>;

/**
 * Define a command handler
 */
export function defineCommandHandler<T extends Flags>(
  command: CommandHandlerRequest<T>
): CommandHandler<Flags, 'wide'> {
  const narrow: CommandHandler<T, 'narrow'> = { ...command, type: 'handler' };

  return narrow as unknown as CommandHandler<Flags, 'wide'>;
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
