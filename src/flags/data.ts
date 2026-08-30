import type { Flag, FlagChoices, Flags, ScalarFlag } from './types.js';

// The text used before a flag name to mark it as a setter
export const SETTER_PREFIX = '--';

// The pattern for a flag setter
const SETTER_PATTERN = new RegExp(`^${SETTER_PREFIX}[a-z]`);

/**
 * Extract the possible choices available for a flag
 */
export function choicesForFlag(flag: Flag): FlagChoices {
  if (flag.type === 'choice') {
    const { choices } = flag;
    return choices ? [...choices] : undefined;
  } else {
    return undefined;
  }
}

/**
 * Convert a flag's name to the text used to set its value via a CLI
 */
export function flagToSetter(name: string): string {
  return SETTER_PREFIX + name;
}
/**
 * Get all forms of a flag's name
 */
export function getFlagForms(name: string, flag: Flag): string[] {
  return flag.type === 'boolean'
    ? [flag.default ? `no-${name}` : name]
    : [name];
}

/**
 * Report whether text describes a setter for a flag
 */
export function isFlagSetter(text: string): boolean {
  return SETTER_PATTERN.exec(text) !== null;
}

/**
 * Report whether a flag is a scalar flag
 */
export function isScalarFlag(flag: Flag): flag is ScalarFlag {
  return flag.type !== 'boolean';
}

/**
 * Omit hidden flags from a collection
 */
export function visibleFlags(flags: Flags): Flags {
  return Object.fromEntries(
    Object.entries(flags).filter(([, flag]) => !flag.hidden)
  );
}
