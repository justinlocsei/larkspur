import { assert, test } from './helpers.ts';

function lines(ls: string[]): string {
  return `${ls.join('\n')}\n`;
}

test('middleware', {
  'runs a plain command': ({ checkOutput }) => {
    assert.equal(
      checkOutput('plain'),
      lines([
        'around:before:plain',
        'command:plain',
        'around:after:plain'
      ])
    );
  },

  'runs a single command that returns output': ({ checkOutput }) => {
    assert.equal(
      checkOutput('single'),
      lines([
        'around:before:single',
        'before:single',
        'after:single',
        'around:after:single',
        'command:single'
      ])
    );
  },

  'runs a nested group command': ({ checkOutput }) => {
    assert.equal(
      checkOutput('group', 'nested'),
      lines([
        'around:before:group:nested',
        'before:group:nested',
        'command:group:nested',
        'after:group:nested',
        'around:after:group:nested'
      ])
    );
  },

  'isolates flag values for middleware': ({ checkOutput }) => {
    assert.equal(
      checkOutput('flagged', '--alfa', 'alfa-value', '--bravo', 'bravo-value'),
      lines([
        'around:before:flagged',
        '[["alfa","alfa-value"]]',
        '[["bravo","bravo-value"]]',
        'around:after:flagged',
        'command:flagged'
      ])
    );
  }
});
