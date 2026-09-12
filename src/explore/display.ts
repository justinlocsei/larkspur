import type { Usage } from '../help/usage.ts';
import { compact } from '../utils.ts';

/**
 * Format a command from its generated usage data
 */
export function formatCommand(usage: Usage): string {
  const { details, flags } = usage;

  const lines = [
    `$ ${usage.title}`,
    ...(details ? ['', `    ${details}`] : [])
  ];

  const indent = '    ';

  if (flags.length) {
    lines.push(
      '',
      ...flags
        .flatMap(flag => {
          return compact([
            flag.setter,
            indent + flag.description,
            flag.required && `${indent}(Required)`,
            ...flag.details.map(d => `${indent}(${d})`)
          ]);
        })
        .map(l => indent + l)
    );
  }

  return lines.join('\n');
}
