import { checkConversion } from '../../src/tests.js';
import type { TestActions } from './helpers.js';
import { assert, test } from './helpers.js';

function checkFlags(
  { checkOutput }: TestActions,
  cases: Array<[string[], object]>
) {
  checkConversion<string[], object>(
    (flags, values, message) =>
      assert.deepEqual(JSON.parse(checkOutput(...flags)), values, message),
    cases
  );
}

test('flags', {
  'allows optional flags to be omitted': (actions) => {
    checkFlags(actions, [
      [['optional'], { boolean: false }],
      [['optional', '--boolean'], { boolean: true }],
      [['optional', '--number', '1'], { boolean: false, number: 1 }],
      [['optional', '--string', 'test'], { boolean: false, string: 'test' }],
      [['optional', '--boolean', '--number', '1', '--string', 'test'], {
        boolean: true,
        number: 1,
        string: 'test'
      }]
    ]);
  },

  'enforces the presence of required flags': ({ run }) => {
    const result = run('required');

    assert.equal(result.status, 1);
    assert.include(result.stderr, 'required');
  },

  'forbids unknown flags': ({ run }) => {
    const result = run('optional', '--not-a-flag');

    assert.equal(result.status, 1);
    assert.include(result.stderr, 'not-a-flag');
  },

  'supports required flags': (actions) => {
    checkFlags(actions, [
      [['required', '--number', '1', '--string', 'alfa'], {
        number: 1,
        string: 'alfa'
      }],
      [['required', '--number', '2', '--string', 'bravo'], {
        number: 2,
        string: 'bravo'
      }]
    ]);
  },

  'supports a mixture of optional and required flags': (actions) => {
    checkFlags(actions, [
      [['mixed', '--string', 'alfa'], {
        string: 'alfa'
      }],
      [['mixed', '--number', '1', '--string', 'bravo'], {
        number: 1,
        string: 'bravo'
      }]
    ]);
  },

  'supports flags with default values': (actions) => {
    checkFlags(actions, [
      [['defaults'], { boolean: true, number: 1, string: 'alfa' }],
      [['defaults', '--no-boolean'], {
        boolean: false,
        number: 1,
        string: 'alfa'
      }],
      [['defaults', '--number', '2'], {
        boolean: true,
        number: 2,
        string: 'alfa'
      }],
      [['defaults', '--string', 'bravo'], {
        boolean: true,
        number: 1,
        string: 'bravo'
      }]
    ]);
  }
});
