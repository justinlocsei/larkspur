/**
 * Lines in a generated completion script
 */
export type ScriptLines = Array<string | ScriptLines>;

/**
 * Format a script's lines as indented text
 */
export function formatScript(
  lines: ScriptLines,
  indent: number = 2
): string {
  const formatted: string[] = [];

  const stack: Array<{ index: number; level: number; lines: ScriptLines }> = [
    { index: 0, level: 0, lines }
  ];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];

    if (!frame) {
      break;
    }

    const line = frame.lines[frame.index++];

    if (line === undefined) {
      stack.pop();
    } else if (typeof line === 'string') {
      formatted.push(`${' '.repeat(indent * frame.level)}${line}`);
    } else {
      stack.push({ index: 0, level: frame.level + 1, lines: line });
    }
  }

  return formatted.join('\n');
}
