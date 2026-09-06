// biome-ignore-all lint/suspicious/noTemplateCurlyInString: used for completion scripts

import type { Flag, Flags } from '../../flags/types.js';
import { compact, sortEntries, transformValues } from '../../utils.js';
import { encodeFlagPath } from '../custom.js';
import type {
  CommandHandler,
  CommandTree,
  CompletionFunction,
  CompletionScript,
  FunctionType,
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
import { quote } from '../scripts.js';

/**
 * A stack frame used when building command completions
 */
type CommandFrame = {
  commands: CommandTree;
  levels: string[];
  visited: boolean;
};

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
        `#compdef ${quote(this.cli.name)}`,
        `compdef ${entry.name} ${quote(this.cli.name)}`,
        '',
        ...this.buildCommandCompletions(this.commands).flatMap(
          f => ['', ...f.lines]
        ),
        '',
        ...entry.lines,
        '',
        `(( $# )) && ${entry.name} "$@"`
      ]
    };
  }

  /**
   * Build a helper function for a user completion flag
   */
  private buildUserFunction(
    flagName: string,
    levels: string[]
  ): CompletionFunction {
    const choices = [
      'choices=("${(@f)$(',
      quote(this.cli.name),
      quote(this.config.completion.group),
      'provide --flag',
      quote(encodeFlagPath(levels, flagName)),
      '--current "$current" --shell zsh )}")'
    ].join(' ');

    return this.defineFunction('user_fn', [...levels, flagName], [
      'local current="${words[CURRENT]#*=}"',
      'local -a choices',
      choices,
      "_describe 'value' choices"
    ]);
  }

  /**
   * Produce completion functions for all commands in a tree
   */
  private buildCommandCompletions(commands: CommandTree): CompletionFunction[] {
    const functions: CompletionFunction[] = [];
    const stack: CommandFrame[] = [{ commands, levels: [], visited: false }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];

      if (!frame) {
        break;
      }

      const { commands: tree, levels } = frame;
      const entries = this.visibleCommandEntries(tree);

      if (!frame.visited) {
        frame.visited = true;

        for (const [name, command] of entries.toReversed()) {
          if (command.type === 'group') {
            stack.push({
              commands: command.subcommands,
              levels: [...levels, name],
              visited: false
            });
          }
        }

        continue;
      }

      stack.pop();

      for (const [name, command] of entries) {
        const path = [...levels, name];

        if (command.type === 'handler' && command.flags) {
          for (const [flagName, flag] of sortEntries(command.flags)) {
            if (isScalarFlag(flag) && flag.completion) {
              functions.push(this.buildUserFunction(flagName, path));
            }
          }
        }

        const body = command.type === 'group'
          ? this.renderTreeCompletions(command.subcommands, path)
          : this.renderHandlerCompletions(command, path);

        functions.push(this.defineFunction('command', path, body));
      }
    }

    return functions;
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
      .map(v => quote(v))
      .join(' ');

    const cases = entries.map(([name]) =>
      [
        `${quote(name)})`,
        this.fns('command', [...levels, name]),
        ';;'
      ].join(' ')
    );

    return [
      `case "$words[${wordIndex}]" in`,
      cases,
      '*)',
      [
        `local -a command_names=(${commandNames})`,
        "_describe 'command' command_names"
      ],
      ';;',
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

    const flagNames = sortEntries(flags)
      .flatMap(([name, flag]) => getFlagForms(name, flag).map(flagToSetter))
      .map(name => quote(name))
      .join(' ');

    const patterns = this.partitionSetterPatterns(flags);

    const flagOrValue = compact([
      '[[ "$words[CURRENT]" == --*=* ]]',
      patterns.scalar && `[[ "$words[CURRENT-1]" == ${patterns.scalar} ]]`,
      patterns.boolean
        ? `{ [[ "$words[CURRENT]" == --* ]] && [[ "$words[CURRENT]" != ${patterns.boolean} ]]; }`
        : '[[ "$words[CURRENT]" == --* ]]'
    ]);

    return [
      `if ${flagOrValue.join(' || ')}; then`,
      [
        '_arguments \\',
        [...specs, '*: :->args'].map((spec, index, all) =>
          `${quote(spec)}${index < all.length - 1 ? ' \\' : ''}`
        )
      ],
      'else',
      [
        `local -a flag_names=(${flagNames})`,
        "_describe 'option' flag_names"
      ],
      'fi'
    ];
  }

  /**
   * Create grouped setter patterns for scalar and boolean flags
   */
  private partitionSetterPatterns(flags: Flags) {
    const setters = sortEntries(flags).reduce<
      Record<'boolean' | 'scalar', string[]>
    >(
      (previous, [name, flag]) => {
        const setters = getFlagForms(name, flag).map(flagToSetter);
        previous[isScalarFlag(flag) ? 'scalar' : 'boolean'].push(...setters);

        return previous;
      },
      { boolean: [], scalar: [] }
    );

    return transformValues(
      setters,
      vs => vs.length > 0 ? `(${vs.join('|')})` : undefined
    );
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

    const description = `[${this.escapeArguments(flag.description)}]`;

    return getFlagForms(name, flag)
      .map(flagToSetter)
      .map(f =>
        isScalarFlag(flag)
          ? `${flag.allowMany ? '*' : ''}${f}=${description}${suffix}`
          : `${f}${description}`
      );
  }

  /**
   * Define a spec for a flag's value
   */
  private renderValueSpec(name: string, flag: Flag, levels: string[]): string {
    const value = `:${flag.type}:`;

    if (isScalarFlag(flag) && flag.completion) {
      return `${value}${this.fns('user_fn', [...levels, name])}`;
    }

    const choices = choicesForFlag(flag);

    return choices
      ? `${value}(${choices.map(v => quote(String(v))).join(' ')})`
      : value;
  }

  /**
   * Define a completion function
   */
  private defineFunction(
    type: FunctionType,
    levels: string[],
    body: ScriptLines
  ): CompletionFunction {
    const name = this.fns(type, levels);

    return {
      lines: [`${name}() {`, body, '}'],
      name
    };
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
