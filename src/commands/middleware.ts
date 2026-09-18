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
  description: string;
  flags?: Flags;
  handler: MiddlewareHandler;
};

/**
 * Build a middleware command
 */
export function buildMiddleware(
  description: string,
  handler: MiddlewareHandler
): MiddlewareCommand;
export function buildMiddleware<T extends Flags>(
  description: string,
  flags: T,
  handler: MiddlewareHandler<T, 'narrow'>
): MiddlewareCommand;
export function buildMiddleware<T extends Flags>(
  description: string,
  flags?: T | MiddlewareHandler,
  handler?: MiddlewareHandler<T, 'narrow'>
): MiddlewareCommand {
  if (typeof flags === 'function') {
    return {
      description,
      handler: flags
    };
  }

  if (typeof handler !== 'function') {
    throw new Error('Invalid middleware request');
  }

  return {
    description,
    flags,
    handler: handler as MiddlewareHandler
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
 * Merged middleware flags
 */
type MergedFlags = {
  conflicts: FlagConflict[];
  flags: Flags;
};

/**
 * A middleware flag that would conflict with an existing one
 */
type FlagConflict = {
  description: string;
  flag: string;
};

/**
 * A source of flag conflicts
 */
type ConflictSource = Record<symbol, FlagConflict[]>;

const flagConflicts = Symbol('middlewareFlagConflicts');

/**
 * Read flag conflicts recorded on a command handler
 */
export function getFlagConflicts(
  command: GenericCommandHandler
): FlagConflict[] {
  const conflicts = (command as ConflictSource)[flagConflicts];

  return conflicts ? [...conflicts] : [];
}

/**
 * Record flag conflicts on a command handler
 */
function setFlagConflicts(
  command: GenericCommandHandler,
  conflicts: FlagConflict[]
): void {
  if (conflicts.length) {
    (command as ConflictSource)[flagConflicts] = conflicts;
  }
}

/**
 * Merge middleware flags into a command's flags
 */
function mergeMiddlewareFlags(
  stack: MiddlewareCommand[],
  commandFlags: Flags,
  existingConflicts: FlagConflict[]
): MergedFlags {
  const merged = { ...commandFlags };
  const conflicts = [...existingConflicts];

  for (const { description, flags = {} } of stack) {
    for (const [name, flag] of sortEntries(flags)) {
      if (name in merged) {
        conflicts.push({ description, flag: name });
      }

      merged[name] = flag;
    }
  }

  return { conflicts, flags: merged };
}

/**
 * Wrap a command handler in a chain of middleware commands
 */
function wrapCommand(
  stack: MiddlewareCommand[],
  commandHandler: GenericHandlerFn,
  commandFlags: Flags,
  parsedFlags: FlagValues,
  details: CommandParsingDetails
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

  const abort = (message: string, description: string): never => {
    throw new Error(`${message}\n${description}`);
  };

  const runAt = async (index: number): Promise<void> => {
    const middleware = stack[index];

    if (!middleware) {
      await runCommand();
      return;
    }

    const { description, flags = {}, handler } = middleware;
    let continued = false;

    await handler(
      async () => {
        if (continued) {
          abort('Middleware called next() more than once', description);
        }

        continued = true;
        await runAt(index + 1);
      },
      {
        command: details.path,
        flags: pickFlagValues(parsedFlags, flags)
      }
    );

    if (!continued) {
      abort('Middleware did not continue the chain', description);
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
  command: GenericCommandHandler
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
      details
    );

    return run();
  };

  const merged = mergeMiddlewareFlags(
    stack,
    flags,
    getFlagConflicts(command)
  );

  const wrapped: GenericCommandHandler = {
    ...command,
    flags: merged.flags,
    handler: wrappedHandler as GenericHandlerFn
  };

  setFlagConflicts(wrapped, merged.conflicts);

  return wrapped;
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
      target[name] = applyToCommand(middleware, command);
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
      ? applyToCommand(stack, target) as T
      : {
        ...target,
        subcommands: applyToTree(stack, target.subcommands)
      };
  } else {
    return applyToTree(stack, target) as T;
  }
}
