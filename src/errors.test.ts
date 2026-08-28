import { assert, describe, it } from 'vitest';

import { coerceError, OperationalError } from './errors.js';
import { checkConversion } from './tests.js';

describe('coerceError', () => {
  it('coerces a range of values to an error', () => {
    checkConversion<unknown, string>(
      (input, output, message) => {
        assert.equal(coerceError(input).message, output, message);
      },
      [
        [new Error('error'), 'error'],
        ['error', 'error'],
        [null, 'Unknown error'],
        [undefined, 'Unknown error'],
        [{ key: 'value' }, '{"key":"value"}']
      ]
    );
  });
});

describe('OperationalError', () => {
  it('is an Error subclass', () => {
    const error = new OperationalError('message');

    assert.instanceOf(error, Error);
    assert.instanceOf(error, OperationalError);
    assert.equal(error.message, 'message');
  });

  it('combines the message and details', () => {
    checkConversion<OperationalError, string>(
      (input, output, message) => {
        assert.equal(input.message, output, message);
      },
      [
        [new OperationalError('message'), 'message'],
        [new OperationalError('message', 'details'), 'message\ndetails'],
        [new OperationalError('message', 'one\ntwo'), 'message\n\none\ntwo']
      ]
    );
  });

  describe('.wrap', () => {
    it('treats a given cause as details for an operational error', () => {
      checkConversion<unknown, string>(
        (cause, output, message) => {
          const error = OperationalError.wrap(cause, 'test-message');

          assert.instanceOf(error, OperationalError);
          assert.include(error.message, 'test-message', message);
          assert.include(error.message, output, message);
        },
        [
          [new OperationalError('error'), 'error'],
          [new Error('error'), 'Error: error'],
          ['error', 'Error: error'],
          [null, 'Error: Unknown error'],
          [undefined, 'Error: Unknown error'],
          [{ key: 'value' }, 'Error: {"key":"value"}']
        ]
      );
    });
  });

  describe('.toString', () => {
    it('includes the details when converted to a string', () => {
      assert.equal(
        new OperationalError('message', 'details').toString(),
        'OperationalError: message\ndetails'
      );
    });

    it('omits non-existent details', () => {
      assert.equal(
        new OperationalError('message').toString(),
        'OperationalError: message'
      );
    });
  });
});
