import type { PrintableFlag, Usage } from '../help/usage.ts';
import { compact } from '../utils.ts';

export const FORMATS = ['full', 'names', 'summary'] as const;

/**
 * An available display format
 */
export type Format = (typeof FORMATS)[number];

/**
 * Format a command from its generated usage data
 */
export function formatCommand(usage: Usage, format: Format = 'full'): string {
  const { details, flags, title } = usage;

  if (format === 'names') {
    return title;
  }

  const lines = [
    `$ ${title}`,
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
