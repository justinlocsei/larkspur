import { visibleCommands } from '../commands/data.js';
import type { Command, CommandTree } from '../commands/types.js';
import { formatList } from '../text.js';
import type { Config, Context, Metadata } from '../types.js';
import { sortEntries } from '../utils.js';
import type { ScriptLines } from './scripts.js';
import { formatScript } from './scripts.js';
import type { SupportedShell } from './shells.js';
import { getShellMetadata } from './shells.js';

export type { Command, CommandHandler } from '../commands/types.js';
export {
  choicesForFlag,
  flagToSetter,
  getFlagForms,
  isScalarFlag,
  isSimpleScalarFlag
} from '../flags/data.js';
export { useSharedFlags } from '../flags/shared.js';
export type { Flags } from '../flags/types.js';
export type { FunctionType, NameGenerator } from './fns.js';

export type { CommandTree, ScriptLines, SupportedShell };

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
   * Build installation instructions for the shell
   */
  abstract buildInstallationInstructions(): string;

  /**
   * Provide the name of the current shell
   */
  protected abstract provideShell(): SupportedShell;

  /**
   * List profile paths for the current shell
   */
  protected listProfiles(): string {
    return formatList(getShellMetadata(this.provideShell()).profiles, 'or');
  }

  /**
   * Build the command to generate a completion script
   */
  protected generateCommand(): string {
    const { group } = this.config.completion;

    return `${this.cli.name} ${group} generate --shell ${this.provideShell()}`;
  }

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
