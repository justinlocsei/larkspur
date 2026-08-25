import { assert } from 'vitest';

import type { Flag } from './flags/types.js';

/**
 * Add a message to an assertion error
 */
function addAssertionMessage(assertion: string, message?: string): string {
  return message ? `${message} (${assertion})` : assertion;
}

/**
 * Coerce a value to an error
 */
function coerceError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  } else if (typeof value === 'string') {
    return new Error(value);
  } else if (value === null || value === undefined) {
    return new Error('Unknown error');
  } else {
    return new Error(JSON.stringify(value));
  }
}

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
 * Assert that a function throws an error matching the given check
 */
export function throwsWith(
  check: () => void,
  checkError: string | ((error: Error) => void),
  message?: string
): void {
  try {
    check();
  } catch (reason) {
    const error = coerceError(reason);

    if (typeof checkError === 'string') {
      assert.include(
        error.toString(),
        checkError,
        addAssertionMessage('Unexpected error text', message)
      );
    } else {
      checkError(error);
    }

    return;
  }

  assert.fail(addAssertionMessage('Expected an error to be thrown', message));
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
