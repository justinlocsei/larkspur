import { assert, test } from './helpers.js';

test(
  'invalid-flags',
  {
    'validates flag names': ({ run }) => {
      const { stderr, status } = run('alfa');

      assert.include(stderr, '-foxtrot');
      assert.include(stderr, 'alfa > bravo > echo');

      assert.equal(status, 1);
    }
  },
  { valid: false }
);
