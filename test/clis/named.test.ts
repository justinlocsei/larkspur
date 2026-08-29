import { assert, test } from './helpers.js';

test('named', 'a CLI with a custom name and description', {
  'shows the custom name': ({ checkOutput }) => {
    const output = checkOutput('--help');

    assert.include(output, 'custom-cli-name');
    assert.include(output, '@description');
  }
});
