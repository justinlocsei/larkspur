import type { HelpScope } from './commands/types.ts';
import type { PrintableCommand, PrintableFlag, Usage } from './help/usage.ts';
import { buildUsage } from './help/usage.ts';
import type { Context } from './types.ts';

/**
 * Build a CLI's help message
 */
export function buildHelp({
  context,
  scope
}: {
  context: Context;
  scope: HelpScope;
}): string {
  return formatHelp(
    buildUsage({ context, scope }),
    context.config.help.indent
  );
}

/**
 * Format usage information as a help message
 */
function formatHelp(usage: Usage, indentSize: number): string {
  const { commands, details, flags } = usage;

  const indent = ' '.repeat(indentSize);
  const lines = [`Usage: ${usage.title}`];

  if (details) {
    lines.push('', details);
  }

  if (commands.length) {
    lines.push(
      '\nCommands:\n',
      formatCommands(commands, indent).join('\n')
    );
  }

  if (flags.length) {
    lines.push('', formatFlags(flags, indent));
  }

  return lines.join('\n');
}

/**
 * Format commands for display
 */
function formatCommands(
  commands: PrintableCommand[],
  indent: string
): string[] {
  const offset = Math.max(...commands.map(c => c.label.length));

  return commands.map(c =>
    [
      indent,
      c.label.padEnd(offset),
      indent,
      c.description
    ].join('')
  );
}

/**
 * Format flags for display
 */
function formatFlags(flags: PrintableFlag[], indent: string): string {
  const required = flags.filter(f => f.required);
  const optional = flags.filter(f => !f.required);

  const format = (flags: PrintableFlag[], title: string): string => {
    const offset = Math.max(...flags.map(f => f.setter.length));
    const lines = flags.flatMap(f => formatFlag(f, offset, indent));

    return [
      `${title}:`,
      lines.map(l => `${indent}${l}`).join('\n')
    ].join('\n\n');
  };

  if (!optional.length) {
    return format(required, 'Required Flags');
  }

  if (!required.length) {
    return format(optional, 'Flags');
  }

  return [
    format(required, 'Required Flags'),
    format(optional, 'Optional Flags')
  ].join('\n\n');
}

/**
 * Format a single flag for display
 */
function formatFlag(
  flag: PrintableFlag,
  offset: number,
  indent: string
): string[] {
  const usage = [
    flag.setter.padEnd(offset),
    indent,
    flag.description
  ].join('');

  const detailIndent = ' '.repeat(offset + indent.length);

  return [
    usage,
    ...flag.details.map(d => `${detailIndent}(${d})`)
  ];
}
