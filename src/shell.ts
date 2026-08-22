const NESTED_QUOTES = /"/g;

/**
 * Quote a value for use in a shell command
 */
export function quote(text: string): string {
  return text.includes(' ')
    ? `"${text.replace(NESTED_QUOTES, '\\"')}"`
    : text || '""';
}
