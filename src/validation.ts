import type { CommandTree } from './commands/types.js';
import { OperationalError } from './errors.js';
import { flagToSetter } from './flags/data.js';
import type { Flags } from './flags/types.js';
import { sortEntries } from './utils.js';

// The pattern for command flag names
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// The reserved prefix for negated boolean flags
export const BOOLEAN_NEGATION_PREFIX = 'no-';

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
  return isValidIdentifier(name) && !name.startsWith(BOOLEAN_NEGATION_PREFIX);
}

/**
 * Validate commands
 */
export function validateCommands(tree: CommandTree): void {
  function validateCommands(tree: CommandTree, path: string[]): void {
    for (const [name, command] of sortEntries(tree)) {
      if (!command) {
        continue;
      }

      const commandPath = [...path, name];
      const scope = commandPath.join(' > ');

      validateCommandName(name, scope);

      if (command.type === 'group') {
        validateCommands(command.subcommands, commandPath);
      } else if (command.flags) {
        validateFlags(command.flags, scope);
      }
    }
  }

  validateCommands(tree, []);
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
function validateFlags(flags: Flags, scope: string): void {
  for (const name of Object.keys(flags)) {
    validateFlagName(name, scope);
  }
}

/**
 * Validate a flag name
 */
function validateFlagName(name: string, scope: string): void {
  const setter = flagToSetter(name);

  const reject = (details?: string): never => {
    throw new OperationalError(
      `Invalid flag ${setter} on command: ${scope}`,
      details
    );
  };

  if (!isValidCommandName(name)) {
    reject();
  } else if (name.startsWith(BOOLEAN_NEGATION_PREFIX)) {
    reject(`Flag names cannot start with "${BOOLEAN_NEGATION_PREFIX}"`);
  }
}
