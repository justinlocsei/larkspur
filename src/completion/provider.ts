import type { CommandTree } from '../commands/types.ts';
import type { ScriptLines } from './script.js';
import { formatScript } from './script.js';

export { CORE_FLAGS } from '../commands/parsing.js';
export type { CommandHandler } from '../commands/types.js';
export {
  choicesForFlag,
  flagToSetter,
  getFlagForms,
  isScalarFlag
} from '../flags/data.js';
export type { Flags } from '../flags/types.js';

export type { CommandTree, ScriptLines };

/**
 * A shell completion script
 */
export type CompletionScript<T = ScriptLines> = {
  entryPoint: string;
  script: T;
};

export abstract class CompletionProvider {
  protected commandName: string;
  protected commands: CommandTree;

  /**
   * Create a generator for completions of a CLI's commands
   */
  constructor(commandName: string, commands: CommandTree) {
    this.commandName = commandName;
    this.commands = commands;
  }

  /**
   * Build a completion script
   */
  buildScript(): CompletionScript<string> {
    const { entryPoint, script } = this.provideScript();

    return {
      entryPoint,
      script: formatScript(script)
    };
  }

  /**
   * Provide the lines of the completion script for the shell
   */
  abstract provideScript(): CompletionScript;

  /**
   * Allow text to be safely used as an identifier
   */
  protected asIdentifier(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, ' ')
      .trim()
      .replace(/\s+/g, '_');
  }
}
