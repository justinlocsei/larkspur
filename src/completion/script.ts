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
  function format(ls: ScriptLines, level: number) {
    const nesting = ' '.repeat(indent * level);

    return ls.reduce((previous: string[], line) => {
      if (typeof line === 'string') {
        previous.push(`${nesting}${line}`);
      } else {
        previous.push(...format(line, level + 1));
      }

      return previous;
    }, []);
  }

  return format(lines, 0).join('\n');
}
