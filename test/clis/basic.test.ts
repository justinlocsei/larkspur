import { assert, test } from './helpers.js';

test('basic', 'a CLI', {
  'runs named commands': ({ checkOutput }) => {
    assert.equal(checkOutput('alfa'), 'one\n');
    assert.equal(checkOutput('bravo'), 'two\n');
  }
});
