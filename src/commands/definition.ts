import type { Flags } from '../flags/types.js';
import type { CommandGroup, CommandHandler } from './types.js';

/**
 * Define a command handler
 */
export function defineCommandHandler<T extends Flags>(
  command: Omit<CommandHandler<T>, 'type'>
): CommandHandler<Flags, 'wide'> {
  const narrow: CommandHandler<T, 'narrow'> = { ...command, type: 'handler' };

  return narrow as unknown as CommandHandler<Flags, 'wide'>;
}

/**
 * Define a command group
 */
export function defineCommandGroup(
  group: Omit<CommandGroup, 'type'>
): CommandGroup {
  return { ...group, type: 'group' };
}
