import { assert, test } from './helpers.ts';

test(
  'invalid',
  {
    'reports combined validation errors': ({ run }) => {
      const { stderr, status } = run('alfa');

      assert.equal(status, 1);

      assert.equal(
        stderr.trim(),
        `
-charlie
  Invalid command name

-golf
  Invalid command name
  Invalid flag ---hotel

alfa > bravo > echo
  Invalid flag ---foxtrot`.trim()
      );
    }
  },
  { valid: false }
);
