import { assert, describe, it } from 'vitest';

import C from '../factory.ts';
import type { ScalarFlag } from '../flags/types.ts';
import { checkConversion } from '../tests.ts';
import type { ScalarValueCompletion } from './data.ts';
import { scalarValueCompletion } from './data.ts';

const description = 'description';

describe('scalarValueCompletion', () => {
  it('uses an appropriate completion strategy for scalar flags', () => {
    checkConversion<ScalarFlag, ScalarValueCompletion>(
      (flag, completion, message) => {
        assert.equal(scalarValueCompletion(flag), completion, message);
      },
      [
        [
          C.flag('string', description, {
            completion: async () => ['custom-alfa']
          }),
          'custom'
        ],
        [C.flag('path', description), 'files'],
        [
          C.flag('choice', description, { choices: ['alfa', 'bravo'] }),
          'choice'
        ],
        [C.flag('string', description), 'none'],
        [C.flag('number', description), 'none']
      ]
    );
  });
});
