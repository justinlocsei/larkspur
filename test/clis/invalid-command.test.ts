import { assert, test } from './helpers.ts';

test(
  'invalid-command',
  {
    'validates command names': ({ run }) => {
      const result = run('alfa');

      assert.include(result.stderr, '-charlie');
      assert.equal(result.status, 1);
    }
  },
  { valid: false }
);
