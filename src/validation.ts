import { getFlagConflicts } from './commands/middleware.ts';
import type {
  Command,
  CommandTree,
  GenericCommandHandler
} from './commands/types.ts';
import { OperationalError } from './errors.ts';
import { flagToSetter } from './flags/data.ts';
import { NEGATE_BOOLEAN } from './flags/names.ts';
import { getReservedFlagNames } from './flags/shared.ts';
import type { Flags } from './flags/types.ts';
import type { Context } from './types.ts';
import { drain, sortEntries } from './utils.ts';

export { NEGATE_BOOLEAN };

// The pattern for command and flag names
export const IDENTIFIER = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
export const IDENTIFIER_PATTERN = new RegExp(`^${IDENTIFIER}$`);

/**
 * Collect validation errors for a command tree
 */
class Validator {
  private context: Context;
  private errors = new Map<string, string[]>();

  constructor(context: Context) {
    this.context = context;
  }

  /**
   * Validate a command tree
   */
  validate(tree: CommandTree): void {
    const stack: Array<{
      command: Command;
      name: string;
      path: string[];
    }> = [];

    const toScope = (path: string[]): string => path.join(' > ');

    const push = (commands: CommandTree, path: string[]): void => {
      for (const [name, command] of sortEntries(commands).reverse()) {
        const currentPath = [...path, name];
        const scope = toScope(currentPath);

        if (command) {
          stack.push({ command, name, path: currentPath });
        } else {
          this.addError(scope, 'No command definition');
        }
      }
    };

    push(tree, []);

    for (const frame of drain(stack)) {
      const { command, name, path } = frame;
      const scope = toScope(path);

      this.validateCommandName(name, scope);

      if (command.type === 'group') {
        push(command.subcommands, path);
      } else {
        this.validateMiddleware(command, scope);

        if (command.flags) {
          this.validateFlags(command.flags, scope);
        }
      }
    }
  }

  /**
   * Format all recorded validation errors
   */
  summarizeErrors(): string | undefined {
    if (this.errors.size === 0) {
      return undefined;
    }

    const lines: string[] = [];

    const sorted = [...this.errors.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    );

    for (const [index, [scope, messages]] of sorted.entries()) {
      if (index > 0) {
        lines.push('');
      }

      lines.push(scope);

      for (const message of messages) {
        for (const line of message.split('\n')) {
          lines.push(`  ${line}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Record a validation error for a command
   */
  private addError(scope: string, message: string): void {
    const entries = this.errors.get(scope);

    if (entries) {
      entries.push(message);
    } else {
      this.errors.set(scope, [message]);
    }
  }

  /**
   * Validate any middleware applied to a command
   */
  private validateMiddleware(
    command: GenericCommandHandler,
    scope: string
  ): void {
    for (const conflict of getFlagConflicts(command)) {
      this.addError(
        scope,
        `Duplicate ${
          flagToSetter(conflict.flag)
        } flag on middleware: ${conflict.description}`
      );
    }
  }

  /**
   * Validate a command name
   */
  private validateCommandName(name: string, scope: string): void {
    if (!isValidCommandName(name)) {
      this.addError(scope, 'Invalid command name');
    }
  }

  /**
   * Validate flags for a command
   */
  private validateFlags(flags: Flags, scope: string): void {
    const reserved = getReservedFlagNames(this.context);

    for (const name of Object.keys(flags)) {
      const setter = flagToSetter(name);

      const reject = (details?: string): void => {
        this.addError(
          scope,
          `Invalid flag ${setter}${details ? `: ${details}` : ''}`
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
}

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
  context: Context
): void {
  const validator = new Validator(context);

  validator.validate(tree);

  const summary = validator.summarizeErrors();

  if (summary) {
    throw new OperationalError(summary);
  }
}
