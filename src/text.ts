/**
 * A joining word for a list
 */
export type ListJoiner = 'and' | 'or';

/**
 * Render a description as a single line of text
 */
export function formatDescription(text: string): string {
  return text.replace(/[\r\n]+/g, ' ');
}

/**
 * Format a list of items with a terminal joiner
 */
export function formatList(items: string[], joiner: ListJoiner): string {
  const [first, second, ...rest] = items;

  if (!first) {
    return '';
  } else if (!second) {
    return first;
  } else if (!rest.length) {
    return `${first} ${joiner} ${second}`;
  } else {
    return `${items.slice(0, -1).join(', ')}, ${joiner} ${items.at(-1)}`;
  }
}
