/**
 * A type of completion function
 */
export type FunctionType =
  | 'command'
  | 'entry'
  | 'files'
  | 'user_fn'
  | 'words';

/**
 * A generator for the name of a CLI completion function
 */
export type NameGenerator = (
  type: FunctionType,
  levels?: string[]
) => string;
