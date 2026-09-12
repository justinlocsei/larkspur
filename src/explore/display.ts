import type { PrintableFlag, Usage } from '../help/usage.ts';
import { compact } from '../utils.ts';

export const FORMATS = ['full', 'names', 'summary'] as const;

/**
 * An available display format
 */
export type Format = (typeof FORMATS)[number];

/**
 * Format explored commands from their generated usage data
 */
export function formatCommands(
  usages: Usage[],
  format: Format = 'full'
): string {
  switch (format) {
    case 'full':
      return usages.map(formatFullCommand).join('\n\n');

    case 'names':
      return usages.map(u => u.title).join('\n');

    case 'summary':
      return formatSummary(usages).join('\n');
  }
}

/**
 * Format a command's usage for verbose display
 */
function formatFullCommand(command: Usage): string {
  const { details, flags } = command;

  const lines = [
    `$ ${command.title}`,
    ...(details ? ['', `    ${details}`] : [])
  ];

  if (flags.length) {
    lines.push('', ...formatFlags(flags).map(l => `    ${l}`));
  }

  return lines.join('\n');
}

/**
 * Format command flags
 */
function formatFlags(flags: PrintableFlag[]): string[] {
  const indent = '  ';

  return flags.flatMap(flag => {
    return compact([
      flag.setter,
      indent + flag.description,
      flag.required && `${indent}(Required)`,
      ...flag.details.map(d => `${indent}(${d})`)
    ]);
  });
}

/**
 * Format a summary for a set of commands
 */
function formatSummary(commands: Usage[]): string[] {
  const longestName = Math.max(...commands.map(c => c.title.length));

  return commands.map(command => {
    return `${command.title.padEnd(longestName)}  # ${command.details}`;
  });
}
