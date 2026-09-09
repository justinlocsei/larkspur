import type { EnvironmentVariables } from '../../types.ts';

// A mapping of property IDs to environment variables
const VARIABLES = {
  runs: 'LARKSPUR_PROP_TEST_RUNS',
  seed: 'LARKSPUR_PROP_TEST_SEED'
};

/**
 * An environment variable used to configure property tests
 */
export type ConfigVariable = keyof typeof VARIABLES;

/**
 * Get a configuration variable's value
 */
export function getConfigVariable(
  variable: ConfigVariable
): string | undefined {
  return process.env[VARIABLES[variable]];
}

/**
 * Set configuration variables
 */
export function setConfigVariables(
  values: Partial<Record<ConfigVariable, number | string>>
): EnvironmentVariables {
  return Object.entries(values).reduce<EnvironmentVariables>(
    (previous, [id, value]) => {
      if (value !== undefined) {
        previous[VARIABLES[id as ConfigVariable]] = String(value);
      }

      return previous;
    },
    {}
  );
}
