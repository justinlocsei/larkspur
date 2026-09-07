import { assert, describe, it } from 'vitest';

import { formatCompletions, parseCompletions } from './output.ts';

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

describe('parseCompletions', () => {
  it('parses formatted completion output', () => {
    assert.deepEqual(
      parseCompletions('alfa-one\nalfa-two\n'),
      ['alfa-one', 'alfa-two']
    );
  });

  it('returns an empty list for empty output', () => {
    assert.deepEqual(parseCompletions(''), []);
  });

  it('round-trips formatted completions', () => {
    const items = ['alfa-one', 'alfa-two'];

    assert.deepEqual(
      parseCompletions(formatCompletions(items)),
      items
    );
  });
});
