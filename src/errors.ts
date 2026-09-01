/**
 * Details for an operational error
 */
type ErrorDetails = OperationalError | string | Error;

/**
 * Coerce a value to an error
 */
export function coerceError(value: unknown): Error {
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

export class OperationalError extends Error {
  /**
   * Treat a value as details for an operational error
   */
  static wrap(cause: unknown, message: string): OperationalError {
    return cause instanceof OperationalError
      ? cause
      : new OperationalError(message, coerceError(cause));
  }

  /**
   * Create an operational error with optional details
   */
  constructor(message: string, details?: ErrorDetails) {
    super(addDetails(message, formatDetails(details)));
    Object.setPrototypeOf(this, OperationalError.prototype);
  }

  /**
   * Include the error name in the printed form
   */
  toString(): string {
    return `OperationalError: ${this.message}`;
  }
}
/**
 * Format error details
 */
function formatDetails(details?: ErrorDetails): string | undefined {
  if (details instanceof OperationalError) {
    return details.toString();
  } else if (details instanceof Error) {
    return details.stack || details.message;
  } else {
    return details;
  }
}

/**
 * Add details to a message
 */
function addDetails(message: string, details: string = ''): string {
  return details
    ? `${message}${details.split('\n').length > 1 ? '\n\n' : '\n'}${details}`
    : message;
}
