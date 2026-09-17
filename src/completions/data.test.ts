import { assert, describe, it } from 'vitest';

import C from '../factory.ts';
import type { ScalarFlag } from '../flags/types.ts';
import { checkConversion, description } from '../tests.ts';
import type { ScalarValueCompletion } from './data.ts';
import { scalarValueCompletion } from './data.ts';

describe('scalarValueCompletion', () => {
  it('uses an appropriate completion strategy for scalar flags', () => {
    checkConversion<ScalarFlag, ScalarValueCompletion>(
      (flag, completion, message) => {
        assert.deepEqual(scalarValueCompletion(flag), completion, message);
      },
      [
        [C.flag('path', description), { type: 'files' }],
        [
          C.flag('choice', description, { choices: ['alfa', 'bravo'] }),
          { type: 'choice', choices: ['alfa', 'bravo'] }
        ],
        [C.flag('string', description), { type: 'none' }],
        [C.flag('number', description), { type: 'none' }]
      ]
    );
  });

  it('includes a flag when completing a custom value', () => {
    const flag = C.flag('string', description, {
      completion: async () => ['custom-alfa']
    });

    assert.deepEqual(
      scalarValueCompletion(flag),
      { type: 'custom', flag }
    );
  });
});
