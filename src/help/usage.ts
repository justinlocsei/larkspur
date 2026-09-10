import { visibleCommands } from '../commands/data.ts';
import type { CommandTree, HelpScope } from '../commands/types.ts';
import {
  choicesForFlag,
  flagToSetter,
  isRepeatableFlag,
  isRequiredFlag
} from '../flags/data.ts';
import { NEGATE_BOOLEAN } from '../flags/names.ts';
import { useSharedFlags } from '../flags/shared.ts';
import type { Flag, Flags } from '../flags/types.ts';
import { formatDescription } from '../text.ts';
import type { Context } from '../types.ts';
import { compact, isEmpty, sortEntries, transformValues } from '../utils.ts';

/**
 * A flag formatted for display
 */
type PrintableFlag = {
  description: string;
  details: string[];
  required: boolean;
  setter: string;
};

/**
 * A command formatted for display
 */
type PrintableCommand = {
  description: string;
  label: string;
};

/**
 * Usage information for a command group or handler
 */
export type Usage = {
  commands: PrintableCommand[];
  details?: string;
  flags: PrintableFlag[];
  title: string;
};

/**
 * Build usage information for a command group or handler
 */
export function buildUsage({
  context,
  scope,
  sharedFlags = true
}: {
  context: Context;
  scope: HelpScope;
  sharedFlags?: boolean;
}): Usage {
  return new UsageBuilder({
    context,
    display: scopeToDisplay(scope, context.meta.description),
    flags: {
      ...(sharedFlags ? useSharedFlags(context.config, scope.type) : {}),
      ...(scope.type === 'command' ? scope.command.flags : {})
    },
    scope
  }).build();
}

/**
 * A display context for usage
 */
type DisplayContext = {
  commands: CommandTree;
  path: string[];
  details?: string;
};

/**
 * Convert a help scope to a display context
 */
function scopeToDisplay(
  scope: HelpScope,
  description?: string
): DisplayContext {
  switch (scope.type) {
    case 'command':
      return {
        commands: {},
        details: formatDescription(scope.command.description),
        path: scope.path
      };

    case 'group':
      return {
        commands: visibleCommands(scope.group.subcommands),
        details: formatDescription(scope.group.description),
        path: scope.path
      };

    case 'root':
      return {
        commands: visibleCommands(scope.commands),
        details: description && formatDescription(description),
        path: []
      };
  }
}

/**
 * Configuration for a usage builder
 */
type UsageBuilderConfig = {
  context: Context;
  display: DisplayContext;
  flags: Flags;
  scope: HelpScope;
};

class UsageBuilder {
  private readonly config: UsageBuilderConfig;

  /**
   * Create a usage builder
   */
  constructor(config: UsageBuilderConfig) {
    this.config = config;
  }

  /**
   * Build usage information
   */
  build(): Usage {
    return {
      commands: this.listCommands(),
      details: this.config.display.details,
      flags: this.listFlags(),
      title: this.buildUsage()
    };
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

    return compact([
      cli.name,
      ...path,
      scope.type !== 'command' && '<command>',
      !isEmpty(flags) && '[flags]'
    ]).join(' ');
  }

  /**
   * List commands
   */
  private listCommands(): PrintableCommand[] {
    const entries = transformValues(
      this.config.display.commands,
      (c, id) => ({
        description: formatDescription(c.description),
        label: compact([id, c.type === 'group' && '<command>']).join(' ')
      })
    );

    return sortEntries(entries).map(([, c]) => c);
  }

  /**
   * List flags
   */
  private listFlags(): PrintableFlag[] {
    return sortEntries(this.config.flags).map(([id, flag]): PrintableFlag => {
      return {
        description: formatDescription(flag.description),
        details: this.listFlagDetails(flag),
        required: isRequiredFlag(flag),
        setter: this.formatSetter(id, flag)
      };
    });
  }

  /**
   * Format a flag's setter for display
   */
  private formatSetter(id: string, flag: Flag): string {
    const [name, value] = flag.type === 'boolean'
      ? [flag.default ? `[${NEGATE_BOOLEAN}]${id}` : id, undefined]
      : [id, flag.type];

    return compact([
      flagToSetter(name),
      value && `<${value}>`,
      isRepeatableFlag(flag) && '...'
    ]).join(' ');
  }

  /**
   * List details for a flag
   */
  private listFlagDetails(flag: Flag): string[] {
    const details: string[] = [];

    const choices = choicesForFlag(flag) || [];
    const defaultValue = flag.default;

    if (choices.length) {
      details.push(`Choices: ${[...choices].sort().join(', ')}`);
    }

    if (defaultValue !== undefined && defaultValue !== false) {
      details.push(`Default: ${defaultValue.toString()}`);
    }

    return details;
  }
}
