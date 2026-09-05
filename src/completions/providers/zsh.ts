// biome-ignore-all lint/suspicious/noTemplateCurlyInString: used for completion scripts

import { visibleCommands } from '../../commands/data.js';
import type { Flag, Flags } from '../../flags/types.js';
import { sortEntries } from '../../utils.js';
import { encodeFlagPath } from '../custom.js';
import type {
  CommandHandler,
  CommandTree,
  CompletionScript,
  ScriptLines
} from '../provider.js';
import {
  CompletionProvider,
  choicesForFlag,
  flagToSetter,
  getFlagForms,
  isScalarFlag,
  useSharedFlags
} from '../provider.js';

/**
 * A type for a completion function
 */
type FunctionType = 'command' | 'entry' | 'user_fn';

export class ZshCompletionProvider extends CompletionProvider {
  provideScript(): CompletionScript {
    const entryPoint = this.nameFunction('entry');

    return {
      entryPoint,
      script: [
        `#compdef ${this.quote(this.cli.name)}`,
        '',
        ...this.renderUserFunction(),
        ...this.renderCommands(this.commands, []),
        '',
        ...this.renderEntry(this.commands),
        '',
        `${entryPoint} "$@"`
      ]
    };
  }

  /**
   * Render the entry point for completions
   */
  private renderEntry(tree: CommandTree): ScriptLines {
    return this.defineFunction(
      'entry',
      [],
      this.renderCommandDispatch(tree)
    );
  }

  /**
   * Render the helper function for user completions
   */
  private renderUserFunction(): ScriptLines {
    const choices = [
      'choices=("${(@f)$(',
      this.quote(this.cli.name),
      this.quote(this.config.completion.group),
      'provide --flag "$flag_path" --current "$current" --shell zsh)}")'
    ].join(' ');

    return this.defineFunction('user_fn', [], [
      'local flag_path=$1',
      'local current="${words[CURRENT]#*=}"',
      'local -a choices',
      choices,
      "_describe 'value' choices"
    ]);
  }

  /**
   * Render completion for a command tree
   */
  private renderCommands(tree: CommandTree, levels: string[]): ScriptLines {
    return sortEntries(visibleCommands(tree)).flatMap(([name, command]) => {
      if (!command) {
        return [];
      }

      const path = [...levels, name];

      const body = command.type === 'group'
        ? this.renderCommandDispatch(command.subcommands, path)
        : this.renderHandler(command, path);

      return ['', ...this.defineFunction('command', path, body)];
    });
  }

  /**
   * Render command-name dispatch for a tree level
   */
  private renderCommandDispatch(
    tree: CommandTree,
    levels: string[] = []
  ): ScriptLines {
    const wordIndex = levels.length + 2;
    const entries = sortEntries(visibleCommands(tree))
      .filter(([, command]) => command);

    const commands = entries.map(([name, command]) =>
      `${name}:${command?.description ?? ''}`
    );

    const cases = entries.map(([name]) =>
      `${this.quote(name)}) ${this.commandFunction([...levels, name])} ;;`
    );

    return [
      'local state',
      "_arguments -C '1:command:->command' '*::arg:->args'",
      'case $state in',
      [
        'command)',
        [
          `local -a command_names=(${
            commands.map(value => this.quote(value)).join(' ')
          })`,
          "_describe 'command' command_names"
        ],
        ';;',
        'args)',
        [
          `case "$words[${wordIndex}]" in`,
          cases,
          'esac'
        ],
        ';;'
      ],
      'esac'
    ];
  }

  /**
   * Render completion for a command handler
   */
  private renderHandler(
    command: CommandHandler,
    levels: string[]
  ): ScriptLines {
    const flags: Flags = {
      ...useSharedFlags(),
      ...(command.flags || {})
    };

    const specs = sortEntries(flags).flatMap(([name, flag]) =>
      this.flagSpecs(name, flag, levels)
    );

    return [
      '_arguments \\',
      specs.map((spec, index) =>
        `${this.quote(spec)}${index < specs.length - 1 ? ' \\' : ''}`
      )
    ];
  }

  /**
   * Define completion specs for a named flag
   */
  private flagSpecs(name: string, flag: Flag, levels: string[]): string[] {
    const suffix = isScalarFlag(flag)
      ? this.valueSpec(name, flag, levels)
      : '';

    return getFlagForms(name, flag)
      .map(flagToSetter)
      .map(f => `${f}[${flag.description}]${suffix}`);
  }

  /**
   * Define a spec for a flag's value
   */
  private valueSpec(name: string, flag: Flag, levels: string[]): string {
    const { type } = flag;

    if (isScalarFlag(flag) && flag.completion) {
      const path = this.quote(encodeFlagPath(levels, name));

      return `:${type}:${this.nameFunction('user_fn')} ${path}`;
    }

    const choices = choicesForFlag(flag);

    return choices
      ? `:${type}:(${choices.map(String).map(this.quote).join(' ')})`
      : `:${type}:`;
  }

  /**
   * Define a completion function
   */
  private defineFunction(
    type: FunctionType,
    levels: string[],
    body: ScriptLines
  ): ScriptLines {
    return [`${this.nameFunction(type, ...levels)}() {`, body, '}'];
  }

  /**
   * Define a function for a specific command
   */
  private commandFunction(levels: string[]): string {
    return this.nameFunction('command', ...levels);
  }

  /**
   * Produce the name of a function
   */
  private nameFunction(type: FunctionType, ...levels: string[]): string {
    return [
      '',
      this.asIdentifier(this.cli.name),
      type,
      ...levels
    ].join('__');
  }
}
