import { assert, describe, it } from 'vitest';

import { quote } from './shell.js';
import { checkConversion } from './tests.js';

describe('quote', () => {
  function checkQuotes(tests: Array<[string, string]>) {
    checkConversion(
      (i, o, m) => assert.equal(quote(i), o, m),
      tests
    );
  }

  it('quotes values with whitespace', () => {
    checkQuotes([
      ['alfa', 'alfa'],
      ['alfa bravo', '"alfa bravo"']
    ]);
  });

  it('handles whitespace-only values', () => {
    checkQuotes([
      ['', '""'],
      [' ', '" "']
    ]);
  });
});
