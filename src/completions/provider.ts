import { visibleCommands } from '../commands/data.js';
import type { Command, CommandTree } from '../commands/types.js';
import type { Config, Context, Metadata } from '../types.js';
import { sortEntries } from '../utils.js';
import type { FunctionType, NameGenerator } from './fns.js';
import { createNameGenerator } from './fns.js';
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

export type { CommandTree, FunctionType, ScriptLines };

/**
 * A generic completion function
 */
export type CompletionFunction = {
  lines: ScriptLines;
  name: string;
};

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
  protected fns: NameGenerator;

  /**
   * Create a generator for completions of a CLI's commands
   */
  constructor(cli: CompletionSource) {
    const { commands, context } = cli;

    this.cli = context.meta;
    this.commands = commands;
    this.config = context.config;
    this.fns = createNameGenerator(this.cli.name);
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
   * List visible commands in a tree, sorted by name
   */
  protected visibleCommandEntries(
    tree: CommandTree
  ): [string, Command][] {
    return sortEntries(visibleCommands(tree)).filter(
      (entry): entry is [string, Command] => entry[1] !== undefined
    );
  }
}

/**
 * A generic completion provider's class
 */
export type CompletionProviderClass = {
  new(cli: CompletionSource): CompletionProvider;
};
