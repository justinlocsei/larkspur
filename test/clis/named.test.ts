import { assert, test } from './helpers.ts';

test('named', {
  'shows the custom name': ({ checkOutput }) => {
    const output = checkOutput('--help');

    assert.include(output, 'custom-cli-name');
    assert.include(output, '@description');
  }
});
