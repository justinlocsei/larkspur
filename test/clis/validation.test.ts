import { checkConversion } from '../../src/tests.js';
import type { TestActions } from './helpers.js';
import { assert, test } from './helpers.js';

function checkFlags(
  { run }: TestActions,
  cases: Array<[string[], boolean]>
) {
  checkConversion(
    (flags, isValid, message) => {
      const { stderr, status } = run(...flags);

      if (isValid) {
        assert.isEmpty(stderr, message);
        assert.equal(status, 0, message);
      } else {
        assert.isNotEmpty(stderr, message);
        assert.equal(status, 1, message);
      }
    },
    cases
  );
}

test('validation', {
  'validates flags using choices': actions => {
    checkFlags(actions, [
      [['choices', '--numbers', '2'], true],
      [['choices', '--numbers', '3'], false],
      [['choices', '--strings', 'bravo'], true],
      [['choices', '--strings', 'charlie'], false]
    ]);
  },

  'validates flags using validator functions': actions => {
    checkFlags(actions, [
      [['fns', '--number', '1'], true],
      [['fns', '--number', '2'], false],
      [['fns', '--string', 'alfa'], true],
      [['fns', '--string', 'bravo'], false]
    ]);
  },

  'reports custom validator messages': ({ run }) => {
    const { stderr, status } = run('fns', '--string', 'bravo');

    assert.equal(status, 1);
    assert.include(stderr, '@alfa');
  },

  'validates flags by type': actions => {
    checkFlags(actions, [
      [['types', '--number', '1'], true],
      [['types', '--number', 'one'], false],
      [['types', '--string', 'alfa'], true],
      [['types', '--string', '1'], true]
    ]);
  }
});
