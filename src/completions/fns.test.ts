import { assert, describe, it } from 'vitest';

import { checkConversion } from '../tests.js';
import type { FunctionType } from './fns.js';
import { createNameGenerator } from './fns.js';

describe('createNameGenerator', () => {
  it('produces names for completion functions', () => {
    checkConversion<[FunctionType, string[]], string>(
      (i, o, m) =>
        assert.equal(createNameGenerator('test-cli')(i[0], i[1]), o, m),
      [
        [['command', ['my-cmd']], '__test_cli__command__my_cmd'],
        [['entry', []], '__test_cli__entry'],
        [
          ['command', ['group', 'nested']],
          '__test_cli__command__group__nested'
        ],
        [['user_fn', ['alfa', 'br avo']], '__test_cli__user_fn__alfa__br_avo'],
        [['words', []], '__test_cli__words']
      ]
    );
  });
});
