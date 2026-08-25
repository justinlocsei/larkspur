import { assert, describe, it } from 'vitest';

import { NormalizedArgs } from './args.js';
import { checkConversion } from './tests.js';

describe('normalizeArgs', () => {
  it('preserves simple args', () => {
    checkConversion<string[], string[]>(
      (i, o, m) => assert.sameOrderedMembers(new NormalizedArgs(i).args, o, m),
      [
        [[], []],
        [['alfa'], ['alfa']],
        [
          ['--alfa', 'value'],
          ['--alfa', 'value']
        ],
        [
          ['--flag', 'needs quotes'],
          ['--flag', 'needs quotes']
        ]
      ]
    );
  });

  it('normalizes flags that use the equals sign', () => {
    checkConversion<string[], string[]>(
      (i, o, m) => assert.sameOrderedMembers(new NormalizedArgs(i).args, o, m),
      [
        [['--alfa=value'], ['--alfa', 'value']],
        [
          ['--alfa=1', '--bravo=2'],
          ['--alfa', '1', '--bravo', '2']
        ]
      ]
    );
  });

  it('handles quoted values in equals-sign bindings', () => {
    checkConversion<string[], string[]>(
      (i, o, m) => assert.sameOrderedMembers(new NormalizedArgs(i).args, o, m),
      [
        [['--alfa="value"'], ['--alfa', 'value']],
        [
          ['--alfa="one two"', '--bravo="three four"'],
          ['--alfa', 'one two', '--bravo', 'three four']
        ]
      ]
    );
  });
});
