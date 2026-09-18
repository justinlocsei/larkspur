import { OperationalError } from '../errors.ts';
import { flagToSetter } from '../flags/data.ts';
import type { FlagContext, Flags } from '../flags/types.ts';
import type { ValuesOf } from '../flags/values.ts';
import { drain, sortEntries } from '../utils.ts';
import type {
  Command,
  CommandGroup,
  CommandParsingDetails,
  CommandTree,
  GenericCommandHandler
} from './types.ts';

/**
 * A target to which middleware can be applied
 */
type MiddlewareTarget = CommandGroup | CommandTree | GenericCommandHandler;

/**
 * A generic command-handler function
 */
type GenericHandlerFn = GenericCommandHandler['handler'];

/**
 * The continuation function in a middleware chain
 */
type NextFn = () => Promise<void>;

/**
 * An inclusive shape for parsed flag values
 */
export type FlagValues = Record<string, unknown>;

/**
 * The context passed to a middleware handler
 */
type MiddlewareHandlerContext<
  F extends Flags = Flags,
  C extends FlagContext = 'wide'
> = {
  command: string[];
  flags: ValuesOf<F, C>;
};

/**
 * A middleware command's handler
 */
export type MiddlewareHandler<
  F extends Flags = Flags,
  C extends FlagContext = 'wide'
> = (
  next: NextFn,
  context: MiddlewareHandlerContext<F, C>
) => Promise<void>;

/**
 * A middleware command
 */
export type MiddlewareCommand = {
  flags?: Flags;
  handler: MiddlewareHandler;
  id: string;
};

/**
 * Build a middleware command
 */
export function buildMiddleware(
  id: string,
  handler: MiddlewareHandler
): MiddlewareCommand;
export function buildMiddleware<T extends Flags>(
  id: string,
  flags: T,
  handler: MiddlewareHandler<T, 'narrow'>
): MiddlewareCommand;
export function buildMiddleware<T extends Flags>(
  id: string,
  flags?: T | MiddlewareHandler,
  handler?: MiddlewareHandler<T, 'narrow'>
): MiddlewareCommand {
  if (typeof flags === 'function') {
    return {
      handler: flags,
      id
    };
  }

  if (typeof handler !== 'function') {
    throw new Error('Invalid middleware request');
  }

  return {
    flags,
    handler: handler as MiddlewareHandler,
    id
  };
}

/**
 * Pick a subset of parsed flag values
 */
function pickFlagValues(
  parsed: FlagValues,
  flags: Flags
): ValuesOf<Flags, 'wide'> {
  return Object.fromEntries(
    Object.keys(flags).map(name => [name, parsed[name]])
  ) as ValuesOf<Flags, 'wide'>;
}

/**
 * Merge middleware flags into a command's flags
 */
function mergeMiddlewareFlags(
  stack: MiddlewareCommand[],
  commandFlags: Flags,
  path: string[]
): Flags {
  const merged = { ...commandFlags };

  for (const { flags = {}, id } of stack) {
    for (const [name, flag] of sortEntries(flags)) {
      if (name in merged) {
        throw new OperationalError(
          `The ${
            flagToSetter(name)
          } flag from the ${id} middleware is already present on command: ${
            path.join(' > ')
          }`
        );
      }

      merged[name] = flag;
    }
  }

  return merged;
}

/**
 * Wrap a command handler in a chain of middleware commands
 */
function wrapCommand(
  stack: MiddlewareCommand[],
  commandHandler: GenericHandlerFn,
  commandFlags: Flags,
  parsedFlags: FlagValues,
  details: CommandParsingDetails,
  command: string[]
): () => Promise<string | undefined> {
  let output: string | undefined;

  const runCommand: NextFn = async () => {
    const result = await commandHandler(
      pickFlagValues(parsedFlags, commandFlags),
      details
    );

    if (typeof result === 'string') {
      output = result;
    }
  };

  const runAt = async (index: number): Promise<void> => {
    const middleware = stack[index];

    if (!middleware) {
      await runCommand();
      return;
    }

    const { flags = {}, handler, id } = middleware;
    let continued = false;

    await handler(
      async () => {
        continued = true;
        await runAt(index + 1);
      },
      {
        command,
        flags: pickFlagValues(parsedFlags, flags)
      }
    );

    if (!continued) {
      throw new OperationalError(
        `Middleware "${id}" did not continue the chain`
      );
    }
  };

  return async () => {
    await runAt(0);
    return output;
  };
}

/**
 * Apply a stack of middleware to a command handler
 */
function applyToCommand(
  stack: MiddlewareCommand[],
  command: GenericCommandHandler,
  path: string[]
): GenericCommandHandler {
  const { flags = {}, handler } = command;

  const wrappedHandler = async (
    parsedFlags: FlagValues,
    details: CommandParsingDetails
  ) => {
    const run = wrapCommand(
      stack,
      handler,
      flags,
      parsedFlags,
      details,
      path
    );

    return run();
  };

  return {
    ...command,
    flags: mergeMiddlewareFlags(stack, flags, path),
    handler: wrappedHandler as GenericHandlerFn
  };
}

/**
 * Deeply apply middleware to every command handler in a tree
 */
function applyToTree(
  middleware: MiddlewareCommand[],
  tree: CommandTree
): CommandTree {
  const result: CommandTree = {};

  const stack: Array<{
    command: Command;
    name: string;
    path: string[];
    target: CommandTree;
  }> = [];

  function push(
    source: CommandTree,
    target: CommandTree,
    path: string[]
  ): void {
    for (const [name, command] of sortEntries(source).reverse()) {
      if (command) {
        stack.push({
          command,
          name,
          path: [...path, name],
          target
        });
      }
    }
  }

  push(tree, result, []);

  for (const frame of drain(stack)) {
    const { command, name, path, target } = frame;

    if (command.type === 'group') {
      const group: CommandGroup = {
        ...command,
        subcommands: {}
      };

      target[name] = group;
      push(command.subcommands, group.subcommands, path);
    } else {
      target[name] = applyToCommand(middleware, command, path);
    }
  }

  return result;
}

/**
 * Report whether a middleware target is a command
 */
function isCommand(target: MiddlewareTarget): target is Command {
  return 'type' in target && typeof target.type === 'string';
}

/**
 * Apply middleware to a command handler, group, or tree
 */
export function applyMiddleware<T extends MiddlewareTarget>(
  stack: MiddlewareCommand[],
  target: T
): T {
  if (isCommand(target)) {
    return target.type === 'handler'
      ? applyToCommand(stack, target, []) as T
      : {
        ...target,
        subcommands: applyToTree(stack, target.subcommands)
      };
  } else {
    return applyToTree(stack, target) as T;
  }
}
