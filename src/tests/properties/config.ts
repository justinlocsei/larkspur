/**
 * An environment variable used to configure property tests
 */
export type ConfigVariable =
  | 'LARKSPUR_PROP_TEST_RUNS'
  | 'LARKSPUR_PROP_TEST_SEED';

/**
 * Get a configuration variable's value
 */
export function getConfigVariable(
  variable: ConfigVariable
): string | undefined {
  return process.env[variable];
}
