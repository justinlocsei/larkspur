import { assert } from 'vitest';

import { coerceError } from '../errors.js';

/**
 * Add a message to an assertion error
 */
function addAssertionMessage(assertion: string, message?: string): string {
  return message ? `${message} (${assertion})` : assertion;
}

/**
 * Assert that an async function produces a rejection
 */
export async function rejects(
  check: () => Promise<unknown>,
  checkError?: string | ((error: Error) => void),
  message = 'Expected a rejected promise'
): Promise<void> {
  try {
    await check();
  } catch (reason) {
    const error = coerceError(reason);

    if (typeof checkError === 'string') {
      assert.include(error.toString(), checkError);
    } else if (checkError) {
      checkError(coerceError(error));
    }

    return;
  }

  assert.fail(message);
}

/**
 * Assert that a function throws an error matching the given check
 */
export function throws(
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
