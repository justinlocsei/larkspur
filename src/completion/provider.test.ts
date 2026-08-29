import { assert, describe, it } from 'vitest';

import type { CompletionScript } from './provider.js';
import { CompletionProvider } from './provider.js';

class TestCompletionProvider extends CompletionProvider {
  provideScript(): CompletionScript {
    return {
      entryPoint: '_complete',
      script: [
        '_complete() {',
        ['echo'],
        '}'
      ]
    };
  }
}

describe('CompletionProvider', () => {
  describe('buildScript', () => {
    function testScript() {
      return new TestCompletionProvider('test-cli', {}).buildScript();
    }

    it('exposes the script entry point', () => {
      assert.equal(testScript().entryPoint, '_complete');
    });

    it('includes formatted script lines from provideScript', () => {
      assert.equal(testScript().script, '_complete() {\n  echo\n}');
    });
  });
});
