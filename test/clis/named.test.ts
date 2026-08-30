import { assert, test } from './helpers.js';

test('named', {
  'shows the custom name': ({ checkOutput }) => {
    const output = checkOutput('--help');

    assert.include(output, 'custom-cli-name');
    assert.include(output, '@description');
  }
});
