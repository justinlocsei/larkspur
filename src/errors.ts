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
  details?: string;

  /**
   * Force a value to be an operational error
   */
  static coerce(value: unknown): OperationalError {
    const error = coerceError(value);

    return error instanceof OperationalError
      ? error
      : new OperationalError(error.message);
  }

  /**
   * Treat a value as details for an operational error
   */
  static wrap(cause: unknown, message: string) {
    return new OperationalError(message, coerceError(cause));
  }

  /**
   * Create an operational error with optional details
   */
  constructor(
    message: string,
    details?: string | Error
  ) {
    super(message);
    Object.setPrototypeOf(this, OperationalError.prototype);

    if (details instanceof OperationalError) {
      this.details = details.toString();
    } else if (details instanceof Error) {
      this.details = details.stack || details.message;
    } else {
      this.details = details;
    }
  }

  /**
   * Format the error
   */
  format(formatMessage: (message: string) => string = m => m): string {
    return this.addDetails(formatMessage(this.message));
  }

  /**
   * Include the optional details in the printed form
   */
  toString(): string {
    return this.addDetails(`OperationalError: ${this.message}`);
  }

  /**
   * Add the error's details to an existing message
   */
  private addDetails(message: string): string {
    const { details = '' } = this;

    return details
      ? `${message}${details.split('\n').length > 1 ? '\n\n' : '\n'}${details}`
      : message;
  }
}
