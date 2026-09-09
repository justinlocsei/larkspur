import type { Command, CommandTree } from './commands/types.ts';
import { OperationalError } from './errors.ts';
import { flagToSetter } from './flags/data.ts';
import { NEGATE_BOOLEAN } from './flags/names.ts';
import { getReservedFlagNames } from './flags/shared.ts';
import type { Flags } from './flags/types.ts';
import type { Config } from './types/config.ts';
import { drain, sortEntries } from './utils.ts';

export { NEGATE_BOOLEAN };

// The pattern for command and flag names
export const IDENTIFIER = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
export const IDENTIFIER_PATTERN = new RegExp(`^${IDENTIFIER}$`);

/**
 * Report whether an identifier is valid
 */
function isValidIdentifier(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name);
}

/**
 * Report whether a command name is valid
 */
export function isValidCommandName(name: string): boolean {
  return isValidIdentifier(name);
}

/**
 * Report whether a flag name is valid
 */
export function isValidFlagName(name: string): boolean {
  return isValidIdentifier(name) && !name.startsWith(NEGATE_BOOLEAN);
}

/**
 * Validate commands
 */
export function validateCommands(
  tree: CommandTree,
  config: Config
): void {
  const stack: Array<{ command: Command; name: string; path: string[] }> = [];

  function push(commands: CommandTree, path: string[]): void {
    for (const [name, command] of sortEntries(commands).reverse()) {
      if (command) {
        stack.push({ command, name, path: [...path, name] });
      }
    }
  }

  push(tree, []);

  for (const frame of drain(stack)) {
    const { command, name, path } = frame;
    const scope = path.join(' > ');

    validateCommandName(name, scope);

    if (command.type === 'group') {
      push(command.subcommands, path);
    } else if (command.flags) {
      validateFlags(command.flags, scope, config);
    }
  }
}

/**
 * Validate a command name
 */
function validateCommandName(name: string, scope: string): void {
  if (!isValidCommandName(name)) {
    throw new OperationalError(
      `Invalid command name: ${scope}`
    );
  }
}

/**
 * Validate flags for a command
 */
function validateFlags(
  flags: Flags,
  scope: string,
  config: Config
): void {
  const reserved = getReservedFlagNames(config);

  for (const name of Object.keys(flags)) {
    const setter = flagToSetter(name);

    const reject = (details?: string): never => {
      throw new OperationalError(
        `Invalid flag ${setter} on command: ${scope}`,
        details
      );
    };

    if (!isValidCommandName(name)) {
      reject();
    } else if (name.startsWith(NEGATE_BOOLEAN)) {
      reject(`Flag names cannot start with "${NEGATE_BOOLEAN}"`);
    } else if (reserved.includes(name)) {
      reject('This name is reserved for internal use');
    }
  }
}
