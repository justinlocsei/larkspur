import type { Flag } from './flags/types.js';

/**
 * Produce a readable representation of an object
 */
export function inspect(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/**
 * Ensure that each input produced the expected output
 */
export function checkConversion<I, O>(
  check: (input: I, output: O, message: string) => void,
  cases: Array<[I, O]>
): void {
  for (const [input, output] of cases) {
    check(
      input,
      output,
      `Input did not produce the expected output: ${inspect(input)}\n${
        inspect(output)
      }`
    );
  }
}

/**
 * Define a basic flag
 */
export function flag(
  type: Flag['type'],
  {
    description = 'description',
    required
  }: {
    description?: string;
    required?: boolean;
  } = {}
): Flag {
  return {
    description,
    required,
    type
  };
}
