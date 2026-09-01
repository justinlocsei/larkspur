import { assert, describe, it } from 'vitest';

import { checkConversion } from './tests.js';
import type { ListJoiner } from './text.js';
import { formatList } from './text.js';

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
