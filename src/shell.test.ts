import { assert, describe, it } from 'vitest';
import { quote } from './shell.js';

describe('quote', () => {
  it('preserves a value that lacks whitespace', () => {
    assert.equal(quote('value'), 'value');
  });

  it('quotes a value with whitespace', () => {
    assert.equal(quote('alfa bravo'), '"alfa bravo"');
  });

  it('return an empty quoted string when given an empty string', () => {
    assert.equal(quote(''), '""');
  });
});
