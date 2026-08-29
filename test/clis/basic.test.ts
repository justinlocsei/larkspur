import { assert, test } from './helpers.js';

test('basic', 'a CLI', {
  'runs commands': ({ checkOutput }) => {
    assert.equal(checkOutput('status'), 'valid\n');
  }
});
