import type { CommandTree } from '../commands/types.js';
import type { Config, Context, Metadata } from '../types.js';
import type { ScriptLines } from './scripts.js';
import { formatScript } from './scripts.js';

export type { Command, CommandHandler } from '../commands/types.js';
export {
  choicesForFlag,
  flagToSetter,
  getFlagForms,
  isScalarFlag
} from '../flags/data.js';
export { useSharedFlags } from '../flags/shared.js';
export type { Flags } from '../flags/types.js';

export type { CommandTree, ScriptLines };

/**
 * A shell completion script
 */
export type CompletionScript<T = ScriptLines> = {
  entryPoint: string;
  script: T;
};

/**
 * The CLI for which to generate completions
 */
export type CompletionSource = {
  commands: CommandTree;
  context: Context;
};

export abstract class CompletionProvider {
  protected cli: Metadata;
  protected commands: CommandTree;
  protected config: Config;

  /**
   * Create a generator for completions of a CLI's commands
   */
  constructor(cli: CompletionSource) {
    const { commands, context } = cli;

    this.cli = context.meta;
    this.commands = commands;
    this.config = context.config;
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

/**
 * A generic completion provider's class
 */
export type CompletionProviderClass = {
  new(cli: CompletionSource): CompletionProvider;
};
