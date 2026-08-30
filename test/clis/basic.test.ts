import { assert, test } from './helpers.js';

test('basic', {
  'runs named commands': ({ checkOutput }) => {
    assert.equal(checkOutput('alfa'), 'one\n');
    assert.equal(checkOutput('bravo'), 'two\n');
  },

  'requires a command': ({ run }) => {
    const result = run();

    assert.equal(result.status, 1);
    assert.include(result.stderr, 'command');
  },

  'forbids unknown commands': ({ run }) => {
    const result = run('charlie');

    assert.equal(result.status, 1);
    assert.include(result.stderr, 'charlie');
  }
});
