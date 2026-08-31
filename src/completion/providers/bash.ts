// biome-ignore-all lint/suspicious/noTemplateCurlyInString: used for completion scripts

import { compact } from '../../utils.js';
import type {
  CommandHandler,
  CommandTree,
  CompletionScript,
  Flags,
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
 * A generic completion function
 */
type CompletionFunction = {
  lines: ScriptLines;
  name: string;
};

/**
 * A type for a completion function
 */
type FunctionType = 'command' | 'entry' | 'user_fn' | 'words';

/**
 * Generated completions
 */
type Completions = {
  children?: Completions[];
  entry: CompletionFunction;
  helpers?: CompletionFunction[];
};

/**
 * A mapping of flag names to custom completion functions
 */
type CustomCompletions = Partial<Record<string, CompletionFunction>>;

export class BashCompletionProvider extends CompletionProvider {
  /**
   * Provide bash completions
   */
  provideScript(): CompletionScript {
    const completions = this.completeCommands(this.commands, []);
    const fn = this.createEntryPoint(completions.entry);

    return {
      entryPoint: fn.entry.name,
      script: [
        ...this.renderCompletions(fn, completions),
        '',
        `complete -o default -F ${fn.entry.name} ${this.cli.name}`
      ]
    };
  }

  /**
   * Render command completions
   */
  private renderCompletions(...completions: Completions[]): ScriptLines {
    const fns: CompletionFunction[] = [];

    function findFns({ children = [], entry, helpers = [] }: Completions) {
      fns.push(entry, ...helpers);
      children.forEach(findFns);
    }

    completions.forEach(findFns);

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
        'local words=$1',
        'local complete_on=$2',
        '',
        'if [[ -z "$words" ]]; then',
        ['COMPREPLY=()'],
        'else',
        ['COMPREPLY=($(compgen -W "$words" -- "$complete_on"))'],
        'fi'
      ]
    );

    const completeFn = this.defineFunction(
      'user_fn',
      [],
      [
        'local fn_name=$1',
        'local complete_on=$2',
        '',
        `${completeWords.name} "$(eval "$fn_name")" "$complete_on"`
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
      name: this.nameFunction(type, ...levels)
    };
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

  /**
   * Produce an invocation of a completion function
   */
  private complete(
    type: FunctionType,
    input: string,
    variable: string
  ): string {
    return [
      this.nameFunction(type),
      `"${input}"`,
      `"${variable}"`
    ].join(' ');
  }

  /**
   * Produce a compgen command to use a set of words from a function's output
   */
  private completeWithFunction(
    fn: CompletionFunction,
    variable: string
  ): string {
    return this.complete('user_fn', fn.name, variable);
  }

  /**
   * Produce a compgen command to match a set of words against a variable
   */
  private completeWords(words: string[], variable: string): string {
    return this.complete('words', words.join(' '), variable);
  }

  /**
   * Define a completion function for a set of commands
   */
  private completeCommands(
    commands: CommandTree,
    levels: string[]
  ): Completions {
    const commandNames = Object.keys(commands).sort();
    const subcommandCases: string[] = [];

    const subcommandCompletions = commandNames.reduce<Completions[]>(
      (previous, name) => {
        const command = commands[name];

        if (!command) {
          return previous;
        }

        const commandLevels = [...levels, this.asIdentifier(name)];

        const completions = command.type === 'group'
          ? this.completeCommands(command.subcommands, commandLevels)
          : this.completeCommand(command, commandLevels);

        subcommandCases.push(
          `${name}) ${completions.entry.name} ${
            command.type === 'group' ? '$next ' : ''
          }"$2" "$3" "$4" ;;`
        );

        previous.push(completions);

        return previous;
      },
      []
    );

    const coreFlags = useSharedFlags(levels.length === 0 ? 'root' : 'nested');

    const setters = Object.entries(coreFlags).flatMap(([n, f]) =>
      getFlagForms(n, f).map(flagToSetter)
    );

    const entry = this.defineFunction('command', levels, [
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

    return {
      entry,
      children: subcommandCompletions
    };
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
      ...useSharedFlags('nested')
    };

    const setters = Object.entries(flags).flatMap(([n, f]) =>
      getFlagForms(n, f).map(flagToSetter)
    );

    const customCompletions = Object.entries(flags).reduce(
      (previous: CustomCompletions, [name, flag]) => {
        if (isScalarFlag(flag) && flag.completion) {
          previous[name] = this.defineFunction(
            'user_fn',
            [...levels, this.asIdentifier(name)],
            [flag.completion]
          );
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

    return {
      entry,
      helpers: compact(Object.values(customCompletions)).sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    };
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

        const customFn = customCompletions[name];

        const completion = customFn
          ? this.completeWithFunction(customFn, completeOn)
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
