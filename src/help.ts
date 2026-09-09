import { visibleCommands } from './commands/data.ts';
import type { CommandTree, HelpScope } from './commands/types.ts';
import { choicesForFlag, flagToSetter } from './flags/data.ts';
import { NEGATE_BOOLEAN } from './flags/names.ts';
import { useSharedFlags } from './flags/shared.ts';
import type { Flag, Flags } from './flags/types.ts';
import { formatDescription } from './text.ts';
import type { Context } from './types.ts';
import { compact, isEmpty, sortEntries, transformValues } from './utils.ts';

/**
 * A flag formatted for display
 */
type PrintableFlag = {
  flag: Flag;
  setter: string;
};

/**
 * Group flags by their status
 */
type GroupFlags<T> = Record<'optional' | 'required', T>;

/**
 * Grouped collections of flags
 */
type GroupedFlags = GroupFlags<Flags>;

/**
 * Sections in a help message
 */
export type HelpSections = {
  commands: string[];
  details?: string;
  flags: GroupFlags<string[]>;
  title: string;
};

/**
 * Generated help
 */
export type Help = {
  message: string;
  sections: HelpSections;
};

/**
 * Build a CLI's help message
 */
export function buildHelp({
  context,
  scope,
  sharedFlags = true
}: {
  context: Context;
  scope: HelpScope;
  sharedFlags?: boolean;
}): Help {
  const flags: Flags = {
    ...(sharedFlags ? useSharedFlags(context.config, scope.type) : {}),
    ...(scope.type === 'command' ? scope.command.flags : {})
  };

  const message = new HelpMessage({
    context,
    display: scopeToDisplay(scope, context.meta.description),
    flags,
    scope
  });

  const sections = message.assemble();

  return {
    message: message.format(sections),
    sections
  };
}

/**
 * A display context for building help messages
 */
type HelpDisplayContext = {
  commands: CommandTree;
  path: string[];
  title?: string;
};

/**
 * Convert a help scope to a display context
 */
function scopeToDisplay(
  scope: HelpScope,
  description?: string
): HelpDisplayContext {
  switch (scope.type) {
    case 'command':
      return {
        commands: {},
        path: scope.path,
        title: formatDescription(scope.command.description)
      };

    case 'group':
      return {
        commands: visibleCommands(scope.group.subcommands),
        path: scope.path,
        title: formatDescription(scope.group.description)
      };

    case 'root':
      return {
        commands: visibleCommands(scope.commands),
        path: [],
        title: description && formatDescription(description)
      };
  }
}

/**
 * Configuration for a help message
 */
type HelpMessageConfig = {
  context: Context;
  display: HelpDisplayContext;
  flags: Flags;
  scope: HelpScope;
};

class HelpMessage {
  private readonly config: HelpMessageConfig;
  private readonly indent: string;

  /**
   * Create a wrapper to manage a help message
   */
  constructor(config: HelpMessageConfig) {
    this.config = config;

    this.indent = ' '.repeat(config.context.config.help.indent);
  }

  /**
   * Build the sections of a help message
   */
  assemble(): HelpSections {
    const { display: { title } } = this.config;

    return {
      commands: this.listCommands(),
      details: title,
      flags: transformValues(this.groupFlags(), fs => this.listFlags(fs)),
      title: this.buildUsage()
    };
  }

  /**
   * Format the help message
   */
  format({
    commands,
    details,
    flags,
    title
  }: HelpSections): string {
    const lines = [`Usage: ${title}`];

    if (details) {
      lines.push('', details);
    }

    if (commands.length) {
      lines.push(
        '\nCommands:\n',
        this.applyIndent(this.listCommands()).join('\n')
      );
    }

    if (!isEmpty(this.config.flags)) {
      lines.push('', this.listGroupedFlags(flags));
    }

    return lines.join('\n');
  }

  /**
   * Apply indentation to a list of lines
   */
  private applyIndent(lines: string[]): string[] {
    return lines.map(l => `${this.indent}${l}`);
  }

  /**
   * Build the usage message
   */
  private buildUsage(): string {
    const {
      context: { meta: cli },
      display: { path },
      flags,
      scope
    } = this.config;

    const needsCommand = scope.type !== 'command';

    return compact([
      cli.name,
      ...path,
      needsCommand && '<command>',
      (needsCommand || !isEmpty(flags)) && '[flags]'
    ]).join(' ');
  }

  /**
   * List commands
   */
  private listCommands(): string[] {
    const { display: { commands } } = this.config;

    const entries = transformValues(
      commands,
      (command, id) => {
        const { description } = command;

        return {
          description: formatDescription(description),
          label: compact([id, command.type === 'group' && '<command>']).join(
            ' '
          )
        };
      }
    );

    const offset = Math.max(...Object.values(entries).map(c => c.label.length));

    return sortEntries(entries)
      .map(([_, entry]) =>
        [
          entry.label.padEnd(offset),
          this.indent,
          entry.description
        ].join('')
      )
      .filter(Boolean);
  }

  /**
   * Group flags by their optional status
   */
  private groupFlags(): GroupedFlags {
    const groups: GroupedFlags = {
      optional: {},
      required: {}
    };

    for (const [id, flag] of Object.entries(this.config.flags)) {
      const required = flag.type !== 'boolean' && flag.required;
      const group = required ? groups.required : groups.optional;

      group[id] = flag;
    }

    return groups;
  }

  /**
   * List grouped flags
   *
   * This is only called if there are flags to list.
   */
  private listGroupedFlags(
    { optional, required }: GroupFlags<string[]>
  ): string {
    if (!optional.length) {
      return this.listFlagGroup(required, 'Required Flags');
    } else if (!required.length) {
      return this.listFlagGroup(optional, 'Flags');
    } else {
      return [
        this.listFlagGroup(required, 'Required Flags'),
        this.listFlagGroup(optional, 'Optional Flags')
      ].join('\n\n');
    }
  }

  /**
   * List a group of flags
   */
  private listFlagGroup(flags: string[], title: string): string {
    return [
      `${title}:`,
      this.applyIndent(flags).join('\n')
    ].join('\n\n');
  }

  /**
   * List flags
   */
  private listFlags(rawFlags: Flags): string[] {
    const flags = transformValues(
      rawFlags,
      (flag, id): PrintableFlag => ({
        flag,
        setter: this.formatSetter(id, flag)
      })
    );

    const setters = Object.values(flags)
      .map(v => v.setter)
      .sort();

    const offset = Math.max(...setters.map(f => f.length));

    return sortEntries(flags)
      .flatMap(([_, flag]) => this.showFlag(flag, offset));
  }

  /**
   * Format a flag's setter for display
   */
  private formatSetter(id: string, flag: Flag): string {
    const name = flag.type === 'boolean'
      ? (flag.default ? `[${NEGATE_BOOLEAN}]${id}` : id)
      : id;

    const repeatable = flag.type !== 'boolean' && flag.repeatable;
    const value = flag.type === 'boolean' ? undefined : flag.type;

    return compact([
      flagToSetter(name),
      value && `<${value}>`,
      repeatable && '...'
    ]).join(' ');
  }

  /**
   * Build usage information for a single flag
   */
  private showFlag({ flag, setter }: PrintableFlag, offset: number): string[] {
    const usage = [
      setter.padEnd(offset),
      this.indent,
      formatDescription(flag.description)
    ].join('');

    const extra: string[] = [];
    const choices = choicesForFlag(flag) || [];

    const defaultValue = flag.default;

    if (choices.length) {
      extra.push(`Choices: ${[...choices].sort().join(', ')}`);
    }

    if (defaultValue !== undefined && defaultValue !== false) {
      extra.push(`Default: ${defaultValue.toString()}`);
    }

    return [
      usage,
      ...extra.map(l => `${' '.repeat(offset + this.indent.length)}(${l})`)
    ];
  }
}
