// biome-ignore-all lint/suspicious/noTemplateCurlyInString: used for completion scripts

import type { Flag, Flags } from '../../flags/types.js';
import { sortEntries } from '../../utils.js';
import { encodeFlagPath } from '../custom.js';
import type {
  CommandHandler,
  CommandTree,
  CompletionFunction,
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
    const entry = this.defineFunction(
      'entry',
      [],
      this.renderTreeCompletions(this.commands)
    );

    return {
      entryPoint: entry.name,
      script: [
        `#compdef ${this.quote(this.cli.name)}`,
        '',
        ...this.buildUserFunction().lines,
        ...this.buildCommandCompletions(this.commands, []).flatMap(
          f => ['', ...f.lines]
        ),
        '',
        ...entry.lines,
        '',
        `${entry.name} "$@"`
      ]
    };
  }

  /**
   * Build the helper function for user completions
   */
  private buildUserFunction(): CompletionFunction {
    const choices = [
      'choices=("${(@f)$(',
      this.quote(this.cli.name),
      this.quote(this.config.completion.group),
      'provide --flag "$flag_path" --current "$current" --shell zsh )}")'
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
   * Produce completions for a command tree
   */
  private buildCommandCompletions(
    tree: CommandTree,
    levels: string[]
  ): CompletionFunction[] {
    return this.visibleCommandEntries(tree).map(([name, command]) => {
      const path = [...levels, name];

      const body = command.type === 'group'
        ? this.renderTreeCompletions(command.subcommands, path)
        : this.renderHandlerCompletions(command, path);

      return this.defineFunction('command', path, body);
    });
  }

  /**
   * Render a completion function for a command tree
   */
  private renderTreeCompletions(
    tree: CommandTree,
    levels: string[] = []
  ): ScriptLines {
    const wordIndex = levels.length + 2; // Skip the CLI name in zsh's one-based arrays
    const entries = this.visibleCommandEntries(tree);

    const commandNames = entries
      .map(([name, c]) => `${name}:${this.escapeDescribe(c.description)}`)
      .map(v => this.quote(v))
      .join(' ');

    const cases = entries.map(([name]) =>
      [
        this.quote(name),
        this.nameFunction('command', [...levels, name]),
        ';;'
      ].join(' ')
    );

    return [
      'local state',
      "_arguments -C '1:command:->command' '*::arg:->args'",
      'case $state in',
      [
        'command)',
        [
          `local -a command_names=(${commandNames})`,
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
   * Render a completion function for a command handler
   */
  private renderHandlerCompletions(
    command: CommandHandler,
    levels: string[]
  ): ScriptLines {
    const flags: Flags = {
      ...useSharedFlags(),
      ...(command.flags || {})
    };

    const specs = sortEntries(flags).flatMap(([name, flag]) =>
      this.renderFlagSpecs(name, flag, levels)
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
  private renderFlagSpecs(
    name: string,
    flag: Flag,
    levels: string[]
  ): string[] {
    const suffix = isScalarFlag(flag)
      ? this.renderValueSpec(name, flag, levels)
      : '';

    return getFlagForms(name, flag)
      .map(flagToSetter)
      .map(f => `${f}[${this.escapeArguments(flag.description)}]${suffix}`);
  }

  /**
   * Define a spec for a flag's value
   */
  private renderValueSpec(name: string, flag: Flag, levels: string[]): string {
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
  ): CompletionFunction {
    const name = this.nameFunction(type, levels);

    return {
      lines: [`${name}() {`, body, '}'],
      name
    };
  }

  /**
   * Produce the name of a function
   */
  private nameFunction(type: FunctionType, levels: string[] = []): string {
    return [
      '',
      this.asIdentifier(this.cli.name),
      type,
      ...levels
    ].join('__');
  }

  /**
   * Escape text passed to _describe
   */
  private escapeDescribe(text: string): string {
    return text.replace(/[\r\n]+/g, ' ');
  }

  /**
   * Escape text passed to _arguments
   */
  private escapeArguments(text: string): string {
    return this.escapeDescribe(text)
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]')
      .replace(/\[/g, '\\[');
  }
}
