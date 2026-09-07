import { assert, describe, it } from 'vitest';

import { checkConversion } from './tests.ts';
import type { ListJoiner } from './text.ts';
import { formatDescription, formatList } from './text.ts';

describe('formatDescription', () => {
  it('collapses newlines to spaces', () => {
    checkConversion<string, string>(
      (input, output, message) =>
        assert.equal(formatDescription(input), output, message),
      [
        ['alfa bravo', 'alfa bravo'],
        ['alfa\nbravo', 'alfa bravo'],
        ['alfa\r\nbravo', 'alfa bravo'],
        ['alfa bravo\n\ncharlie delta', 'alfa bravo charlie delta']
      ]
    );
  });
});

describe('formatList', () => {
  it('formats lists', () => {
    checkConversion<[string[], ListJoiner], string>(
      (input, output, message) =>
        assert.equal(formatList(...input), output, message),
      [
        [[[], 'or'], ''],
        [[['a'], 'or'], 'a'],
        [[['a', 'b'], 'or'], 'a or b'],
        [[['a', 'b'], 'and'], 'a and b'],
        [
          [['a', 'b', 'c'], 'or'],
          'a, b, or c'
        ],
        [[['a', 'b', 'c', 'd'], 'and'], 'a, b, c, and d']
      ]
    );
  });
});
