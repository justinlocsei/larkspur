import type { HelpScope } from './commands/parsing.js';
import type { CommandTree } from './commands/types.js';
import { choicesForFlag, flagToSetter, visibleFlags } from './flags/data.js';
import { useSharedFlags } from './flags/shared.js';
import type { Flag, Flags } from './flags/types.ts';
import type { Context } from './types.js';
import { compact, isEmpty, sortEntries, transformValues } from './utils.js';

/**
 * A flag formatted for display
 */
type PrintableFlag = {
  flag: Flag;
  setter: string;
};

/**
 * Grouped collections of flags
 */
type GroupedFlags = {
  optional: Flags;
  required: Flags;
};

/**
 * A request to display a help message
 */
type HelpDisplayRequest = {
  context: Context;
  scope: HelpScope;
};

/**
 * Build the text of a CLI's help message
 */
export function buildHelp({
  context,
  scope
}: HelpDisplayRequest): string {
  const flags: Flags = visibleFlags({
    ...useSharedFlags(scope.type === 'root' ? 'root' : 'nested'),
    ...(scope.type === 'command' ? scope.command.flags : {})
  });

  const message = new HelpMessage({
    context,
    display: scopeToDisplay(scope, context.meta.description),
    flags,
    scope
  });

  return message.format();
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
        title: scope.command.description
      };

    case 'group':
      return {
        commands: scope.group.subcommands,
        path: scope.path,
        title: scope.group.description
      };

    case 'root':
      return {
        commands: scope.commands,
        path: [],
        title: description
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
  private readonly gutter: string;
  private readonly indent: string;

  /**
   * Create a wrapper to manage a help message
   */
  constructor(config: HelpMessageConfig) {
    this.config = config;

    const { gutter, indent } = config.context.config.help.formatting;

    this.gutter = ' '.repeat(gutter);
    this.indent = ' '.repeat(indent);
  }

  /**
   * Format the help message
   */
  format(): string {
    const { display: { commands, title }, flags } = this.config;

    const lines = [this.buildUsage()];

    if (title) {
      lines.push('', title);
    }

    if (!isEmpty(commands)) {
      lines.push('\nCommands:\n', this.listCommands());
    }

    if (!isEmpty(flags)) {
      lines.push('', this.listGroupedFlags(this.groupFlags()));
    }

    return lines.join('\n');
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

    const usage = compact([
      cli.name,
      ...path,
      needsCommand && '<command>',
      (needsCommand || !isEmpty(flags)) && '[flags]'
    ]);

    return `Usage: ${usage.join(' ')}`;
  }

  /**
   * List commands
   */
  private listCommands(): string {
    const { display: { commands } } = this.config;

    const entries = transformValues(
      commands,
      (command, id) => {
        const { description } = command;

        return {
          description,
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
          this.indent,
          entry.label.padEnd(offset),
          this.gutter,
          entry.description
        ].join('')
      )
      .filter(Boolean)
      .join('\n');
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
  private listGroupedFlags({ optional, required }: GroupedFlags): string {
    if (isEmpty(optional)) {
      return this.listFlagGroup(required, 'Required Flags');
    } else if (isEmpty(required)) {
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
  private listFlagGroup(flags: Flags, title: string): string {
    return [`${title}:`, this.listFlags(flags)].join('\n\n');
  }

  /**
   * List flags
   */
  private listFlags(rawFlags: Flags): string {
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
      .flatMap(([_, flag]) => this.showFlag(flag, offset))
      .join('\n');
  }

  /**
   * Format a flag's setter for display
   */
  private formatSetter(id: string, flag: Flag): string {
    const name = flag.type === 'boolean'
      ? (flag.default ? `[no-]${id}` : id)
      : id;

    const allowMany = flag.type !== 'boolean' && flag.allowMany;
    const value = flag.type === 'boolean' ? undefined : flag.type;

    return compact([
      flagToSetter(name),
      value && `<${value}>`,
      allowMany && '...'
    ]).join(' ');
  }

  /**
   * Build usage information for a single flag
   */
  private showFlag({ flag, setter }: PrintableFlag, offset: number): string[] {
    const { gutter, indent } = this.config.context.config.help.formatting;

    const usage = [
      this.indent,
      setter.padEnd(offset),
      this.gutter,
      flag.description
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
      ...extra.map(l => `${' '.repeat(offset + gutter + indent)}(${l})`)
    ];
  }
}
