const DELIMITER = '\n';
const FORBIDDEN_CHARACTERS = ['\0', '\r', DELIMITER];

/**
 * Omit completion values that cannot be represented in shell output
 */
function prepareCompletions(completions: string[]): string[] {
  return completions
    .map(String)
    .filter(Boolean)
    .filter(v => !FORBIDDEN_CHARACTERS.some(c => v.includes(c)));
}

/**
 * Format completion values for shell consumption
 */
export function formatCompletions(completions: string[]): string {
  const values = prepareCompletions(completions).join(DELIMITER);

  return values && `${values}${DELIMITER}`;
}
