import { assert, describe, it } from 'vitest';

import C from '../factory.js';
import { createTestContext } from '../tests.js';
import type { CompletionScript } from './provider.js';
import { CompletionProvider } from './provider.js';
import type { SupportedShell } from './shells.js';

class TestCompletionProvider extends CompletionProvider {
  buildInstallationInstructions(): string {
    return '';
  }

  protected provideShell(): SupportedShell {
    return 'bash';
  }

  provideScript(): CompletionScript {
    return {
      entryPoint: this.cli.name,
      script: [
        '_complete() {',
        [`echo "${Object.keys(this.commands).sort().join(' ')}"`],
        '}'
      ]
    };
  }
}

describe('CompletionProvider', () => {
  describe('buildScript', () => {
    function testScript() {
      const command = C('description', async () => {});

      return new TestCompletionProvider({
        commands: {
          alfa: command,
          bravo: command
        },
        context: createTestContext({ name: 'test-cli' })
      }).buildScript();
    }

    it('exposes the script entry point', () => {
      assert.equal(testScript().entryPoint, 'test-cli');
    });

    it('includes formatted script lines from provideScript', () => {
      assert.equal(
        testScript().script,
        '_complete() {\n  echo "alfa bravo"\n}'
      );
    });
  });
});
