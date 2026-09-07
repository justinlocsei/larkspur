// biome-ignore-all lint/suspicious/noTemplateCurlyInString: used for completion scripts

import { formatList } from '../../text.js';
import { compact, drain } from '../../utils.js';
import { encodeFlagPath } from '../custom.js';
import type { NameGenerator } from '../fns.js';
import type {
  Command,
  CommandHandler,
  CommandTree,
  CompletionFunction,
  CompletionScript,
  CompletionSource,
  Flags,
  FunctionType,
  ScriptLines
} from '../provider.js';
import {
  CompletionProvider,
  choicesForFlag,
  flagToSetter,
  getFlagForms,
  isScalarFlag,
  isSimpleScalarFlag,
  useSharedFlags
} from '../provider.js';
import { quote } from '../scripts.js';
import { getShellMetadata } from '../shells.js';

/**
 * Generated completions
 */
type Completions = {
  children?: Completions[];
  entry: CompletionFunction;
  helpers?: CompletionFunction[];
};

/**
 * A mapping of flag names to encoded flag paths
 */
type CustomCompletions = Partial<Record<string, string>>;

/**
 * A stack frame used when building completions
 */
type Frame = {
  commands: CommandTree;
  key: string;
  levels: string[];
  visited: boolean;
};

export class BashCompletionProvider extends CompletionProvider {
  private fns: NameGenerator;

  /**
   * Create a generator for bash function names
   */
  static createNameGenerator(cliName: string): NameGenerator {
    const sanitize = (text: string): string =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, ' ')
        .trim()
        .replace(/\s+/g, '_');

    return (type, levels = []) =>
      ['', sanitize(cliName), type, ...levels.map(sanitize)].join('__');
  }

  constructor(cli: CompletionSource) {
    super(cli);
    this.fns = BashCompletionProvider.createNameGenerator(this.cli.name);
  }

  /**
   * Provide bash completions
   */
  provideScript(): CompletionScript {
    const completions = this.completeCommands(this.commands);
    const fn = this.createEntryPoint(completions.entry);

    return {
      entryPoint: fn.entry.name,
      script: [
        ...this.renderCompletions(fn, completions),
        '',
        `complete -o default -F ${fn.entry.name} ${quote(this.cli.name)}`
      ]
    };
  }

  buildInstallationInstructions(): string {
    const { group } = this.config.completion;
    const profiles = formatList(getShellMetadata('bash').profiles, 'or');
    const generate = `${this.cli.name} ${group} generate --shell bash`;

    return [
      `Add this line to your bash profile (${profiles}):`,
      '',
      `  eval "$(${generate})"`,
      '',
      'To use these completions, reload your profile or start a new shell.'
    ].join('\n');
  }

  /**
   * Render command completions
   */
  private renderCompletions(...completions: Completions[]): ScriptLines {
    const fns: CompletionFunction[] = [];

    const stack = [...completions].reverse();

    for (const completion of drain(stack)) {
      const { children = [], helpers = [] } = completion;

      fns.push(completion.entry, ...helpers);

      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];

        if (child) {
          stack.push(child);
        }
      }
    }

    return fns.flatMap((fn, index) => {
      const rendered = [`${fn.name}() {`, fn.lines, '}'];

      if (index) {
        rendered.unshift('');
      }

      return rendered;
    });
  }

  /**
   * Create the top-level functions that provide completion
   */
  private createEntryPoint(completer: CompletionFunction): Completions {
    const entry = this.defineFunction(
      'entry',
      [],
      [
        'COMPREPLY=()',
        '',
        'local current="${COMP_WORDS[COMP_CWORD]}"',
        'local previous="${COMP_WORDS[COMP_CWORD-1]}"',
        '',
        'local current_key_value=(${current/=/ })',
        'local current_value="${current_key_value[1]}"',
        '',
        `${completer.name} 1 "$previous" "$current" "$current_value"`
      ]
    );

    const completeWords = this.defineFunction(
      'words',
      [],
      [
        'local complete_on=${@: -1}',
        '',
        'if [[ $# -lt 2 ]]; then',
        ['COMPREPLY=()'],
        'elif [[ $# -eq 2 ]]; then',
        [
          'local words=$1',
          'COMPREPLY=($(compgen -W "$words" -- "$complete_on"))'
        ],
        'else',
        [
          'local -a words=("${@:1:$#-1}")',
          'local word',
          'COMPREPLY=()',
          'for word in "${words[@]}"; do',
          [
            'if [[ "$word" == "$complete_on"* ]]; then',
            ['COMPREPLY+=("$word")'],
            'fi'
          ],
          'done'
        ],
        'fi'
      ]
    );

    const completeFn = this.defineFunction(
      'user_fn',
      [],
      [
        'local flag_path=$1',
        'local complete_on=$2',
        'local value',
        'COMPREPLY=()',
        `while IFS= read -r value; do`,
        [
          'if [[ "$value" == "$complete_on"* ]]; then',
          ['COMPREPLY+=("$value")'],
          'fi'
        ],
        `done < <(${quote(this.cli.name)} ${
          quote(this.config.completion.group)
        } provide --flag "$flag_path" --current "$complete_on" --shell bash)`
      ]
    );

    return {
      entry,
      helpers: [completeFn, completeWords]
    };
  }

  /**
   * Define a completion function
   */
  private defineFunction(
    type: FunctionType,
    levels: string[],
    lines: ScriptLines
  ): CompletionFunction {
    return {
      lines,
      name: this.fns(type, levels)
    };
  }

  /**
   * Produce an invocation of a completion function
   */
  private complete(
    type: FunctionType,
    inputs: string[],
    variable: string
  ): string {
    return [
      this.fns(type),
      ...inputs.map(i => quote(i)),
      `"${variable}"`
    ].join(' ');
  }

  /**
   * Invoke the user completion provider for a flag path
   */
  private completeWithFunction(
    flagPath: string,
    variable: string
  ): string {
    return this.complete('user_fn', [flagPath], variable);
  }

  /**
   * Produce a compgen command to match a set of words against a variable
   */
  private completeWords(words: string[], variable: string): string {
    return this.complete('words', words, variable);
  }

  /**
   * Define a completion function for a set of commands
   */
  private completeCommands(commands: CommandTree): Completions {
    const built = new Map<string, Completions>();
    const stack: Frame[] = [{ commands, key: '0', levels: [], visited: false }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];

      if (!frame) {
        break;
      }

      const { commands, key, levels } = frame;

      const entries = this.visibleCommandEntries(commands);
      const commandNames = entries.map(([name]) => name);

      if (!frame.visited) {
        frame.visited = true;

        for (let i = entries.length - 1; i >= 0; i--) {
          const entry = entries[i];

          if (!entry) {
            continue;
          }

          const [name, command] = entry;

          if (command.type === 'group') {
            stack.push({
              commands: command.subcommands,
              key: `${key}.${i}`,
              levels: [...levels, name],
              visited: false
            });
          }
        }

        continue;
      }

      stack.pop();

      const subcommandCases: string[] = [];
      const subcommandCompletions: Completions[] = [];

      for (const [name, command] of entries) {
        const completions = command.type === 'group'
          ? built.get(`${key}.${commandNames.indexOf(name)}`)
          : this.completeCommand(command, [...levels, name]);

        if (!completions) {
          continue;
        }

        subcommandCases.push(this.subcommandCase(name, completions, command));
        subcommandCompletions.push(completions);
      }

      built.set(
        key,
        {
          children: subcommandCompletions,
          entry: this.defineCommandGroupFunction(
            levels,
            commandNames,
            subcommandCases
          )
        }
      );
    }

    const completion = built.get('0');

    if (!completion) {
      throw new Error('Failed to build command completions');
    }

    return completion;
  }

  /**
   * Produce a case branch for completing a subcommand
   */
  private subcommandCase(
    name: string,
    completions: Completions,
    command: Command
  ): string {
    return `${name}) ${completions.entry.name} ${
      command.type === 'group' ? '$next ' : ''
    }"$2" "$3" "$4" ;;`;
  }

  /**
   * Define the completion function for a command group
   */
  private defineCommandGroupFunction(
    levels: string[],
    commandNames: string[],
    subcommandCases: string[]
  ): CompletionFunction {
    const setters = Object.entries(useSharedFlags()).flatMap(([n, f]) =>
      getFlagForms(n, f).map(flagToSetter)
    );

    return this.defineFunction('command', levels, [
      'local index=$1',
      'local next=$((index+1))',
      'local word="${COMP_WORDS[index]}"',
      '',
      'if [[ $index -eq $COMP_CWORD ]]; then',
      [
        'case "$word" in',
        compact([
          setters.length > 0
          && `--*) ${this.completeWords(setters.sort(), '$word')} ;;`,
          `*) ${this.completeWords(commandNames, '$word')} ;;`
        ]),
        'esac'
      ],
      'else',
      ['case "$word" in', [...subcommandCases, '*) COMPREPLY=() ;;'], 'esac'],
      'fi'
    ]);
  }

  /**
   * Define completion functions for a command handler
   */
  private completeCommand(
    command: CommandHandler,
    levels: string[]
  ): Completions {
    const flags: Flags = {
      ...command.flags,
      ...useSharedFlags()
    };

    const setters = Object.entries(flags).flatMap(([n, f]) =>
      getFlagForms(n, f).map(flagToSetter)
    );

    const customCompletions = Object.entries(flags).reduce(
      (previous: CustomCompletions, [name, flag]) => {
        if (isSimpleScalarFlag(flag) && flag.completion) {
          previous[name] = encodeFlagPath(levels, name);
        }

        return previous;
      },
      {}
    );

    const entry = this.defineFunction('command', levels, [
      'case "$2" in',
      [
        ...this.completeScalarSetters(flags, '=*', '$3', customCompletions),
        '*)',
        [
          'case "$1" in',
          [
            ...this.completeScalarSetters(flags, '', '$2', customCompletions),
            `*) ${this.completeWords(setters.sort(), '$2')} ;;`
          ],
          'esac',
          ';;'
        ]
      ],
      'esac'
    ]);

    return { entry };
  }

  /**
   * Create case branches for completing a scalar's setters
   */
  private completeScalarSetters(
    flags: Flags,
    suffix: string,
    completeOn: string,
    customCompletions: CustomCompletions
  ): string[] {
    return Object.entries(flags)
      .reduce((previous: string[], [name, flag]) => {
        if (!isScalarFlag(flag)) {
          return previous;
        }

        const forms = getFlagForms(name, flag)
          .sort()
          .map(f => flagToSetter(f) + suffix)
          .join('|');

        const flagPath = customCompletions[name];

        const completion = flagPath
          ? this.completeWithFunction(flagPath, completeOn)
          : this.completeWords(
            [...(choicesForFlag(flag) || [])].sort().map(String),
            completeOn
          );

        previous.push(`${forms}) ${completion} ;;`);

        return previous;
      }, [])
      .sort();
  }
}
