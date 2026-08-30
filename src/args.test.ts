import { assert, describe, it } from 'vitest';

import { NormalizedArgs } from './args.js';
import { checkConversion } from './tests.js';

describe('NormalizeArgs', () => {
  function checkArgs(tests: Array<[string[], string[]]>) {
    checkConversion(
      (i, o, m) => assert.sameOrderedMembers(new NormalizedArgs(i).args, o, m),
      tests
    );
  }

  it('preserves simple args', () => {
    checkArgs([
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
    ]);
  });

  it('normalizes flags that use the equals sign', () => {
    checkArgs([
      [['--alfa=value'], ['--alfa', 'value']],
      [
        ['--alfa=1', '--bravo=2'],
        ['--alfa', '1', '--bravo', '2']
      ]
    ]);
  });

  it('handles quoted values in equals-sign bindings', () => {
    checkArgs([
      [['--alfa="value"'], ['--alfa', 'value']],
      [
        ['--alfa="one two"', '--bravo="three four"'],
        ['--alfa', 'one two', '--bravo', 'three four']
      ]
    ]);
  });
});
