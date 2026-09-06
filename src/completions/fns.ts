/**
 * A type of completion function
 */
export type FunctionType =
  | 'command'
  | 'entry'
  | 'user_fn'
  | 'words';

/**
 * A generator for the name of a CLI completion function
 */
export type NameGenerator = (
  type: FunctionType,
  levels?: string[]
) => string;

/**
 * Sanitize a value for use in a function name
 */
function sanitize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Create a function that produces completion-function names for a CLI
 */
export function createNameGenerator(cliName: string): NameGenerator {
  return (type: FunctionType, levels: string[] = []): string =>
    ['', sanitize(cliName), type, ...levels.map(sanitize)].join('__');
}
