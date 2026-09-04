import { assert, describe, it } from 'vitest';

import { formatCompletions } from './output.js';

describe('formatCompletions', () => {
  it('formats values as a newline-delimited list', () => {
    assert.equal(
      formatCompletions(['alfa-one', 'alfa-two']),
      'alfa-one\nalfa-two\n'
    );
  });

  it('returns an empty string when there are no values', () => {
    assert.equal(formatCompletions([]), '');
  });

  it('omits unsupported values', () => {
    assert.equal(
      formatCompletions(['bad\nvalue', 'valid', 'other\r', 'null\0']),
      'valid\n'
    );
  });
});

