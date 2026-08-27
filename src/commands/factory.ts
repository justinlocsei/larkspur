import type { Flags } from '../flags/types.js';
import type {
  CommandGroupRequest,
  CommandHandlerRequest
} from './definition.js';
import { defineCommandGroup, defineCommandHandler } from './definition.js';
import type {
  CommandHandler,
  CommandTree,
  CommmandHandlerFn
} from './types.js';

/**
 * Build a command handler
 */
function buildCommandHandler(
  description: string,
  handler: CommmandHandlerFn
): CommandHandler<Flags, 'wide'>;
function buildCommandHandler<T extends Flags>(
  description: string,
  flags: T,
  handler: CommmandHandlerFn<T>
): CommandHandler<Flags, 'wide'>;
function buildCommandHandler<T extends Flags>(
  command: CommandHandlerRequest<T>
): CommandHandler<Flags, 'wide'>;
function buildCommandHandler<T extends Flags>(
  description: string | CommandHandlerRequest<T>,
  flags?: T | CommmandHandlerFn<T>,
  handler?: CommmandHandlerFn<T>
): CommandHandler<Flags, 'wide'> {
  let request: CommandHandlerRequest<T>;

  if (typeof description === 'string') {
    if (typeof flags === 'function') {
      request = { description, handler: flags };
    } else if (typeof handler === 'function') {
      request = { description, flags, handler };
    } else {
      throw new Error('Invalid command handler request');
    }
  } else {
    request = description;
  }

  return defineCommandHandler(request);
}

/**
 * Build a command group
 */
function buildCommandGroup(
  description: string,
  subcommands: CommandTree
): ReturnType<typeof defineCommandGroup>;
function buildCommandGroup(
  group: CommandGroupRequest
): ReturnType<typeof defineCommandGroup>;
function buildCommandGroup(
  description: string | CommandGroupRequest,
  subcommands: CommandTree = {}
): ReturnType<typeof defineCommandGroup> {
  return typeof description === 'string'
    ? defineCommandGroup({ description, subcommands })
    : defineCommandGroup(description);
}

/**
 * A factory for all command types
 */
type CommandFactory = typeof buildCommandHandler & {
  group: typeof buildCommandGroup;
};

const factory = buildCommandHandler as CommandFactory;
factory.group = buildCommandGroup;

export default factory;
