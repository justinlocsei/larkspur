import type { Flags } from '../flags/types.ts';
import type {
  CommandGroupRequest,
  CommandHandlerRequest
} from './definition.ts';
import { defineCommandGroup, defineCommandHandler } from './definition.ts';
import type {
  CommandHandler,
  CommandTree,
  CommmandHandlerFn
} from './types.ts';

/**
 * Build a command handler
 */
export function buildCommandHandler(
  description: string,
  handler: CommmandHandlerFn
): CommandHandler<Flags, 'wide'>;
export function buildCommandHandler<T extends Flags>(
  description: string,
  flags: T,
  handler: CommmandHandlerFn<T>
): CommandHandler<Flags, 'wide'>;
export function buildCommandHandler<T extends Flags>(
  command: CommandHandlerRequest<T>
): CommandHandler<Flags, 'wide'>;
export function buildCommandHandler<T extends Flags>(
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
export function buildCommandGroup(
  description: string,
  subcommands: CommandTree
): ReturnType<typeof defineCommandGroup>;
export function buildCommandGroup(
  group: CommandGroupRequest
): ReturnType<typeof defineCommandGroup>;
export function buildCommandGroup(
  description: string | CommandGroupRequest,
  subcommands: CommandTree = {}
): ReturnType<typeof defineCommandGroup> {
  return typeof description === 'string'
    ? defineCommandGroup({ description, subcommands })
    : defineCommandGroup(description);
}

/**
 * Build a command tree
 */
export function buildCommandTree(tree: CommandTree): CommandTree {
  return tree;
}
