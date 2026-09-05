import { assert, describe, it } from 'vitest';

import { createCompletionCommands } from '../../../test/fixtures/commands.js';
import { createTestContext } from '../../tests.js';
import type { CompletionProviderClass } from '../provider.js';

const TEST_LABELS = {
  booleans: 'completes boolean flags in positive and negative form',
  choices: 'completes choice flags',
  custom: 'calls user-provided completion functions',
  groups: 'builds functions for groups and handlers',
  nested: 'builds functions for nested handlers',
  quoting: 'quotes values used in the generated script',
  scalars: 'completes scalar flags'
};

/**
 * An internal label for a test case
 */
type TestLabel = keyof typeof TEST_LABELS;

/**
 * Generate tests for a completion provider's script
 */
export function testProvider(
  Provider: CompletionProviderClass,
  expectations: Record<TestLabel, string[]>
): void {
  function buildScript(commands = createCompletionCommands()) {
    return new Provider({
      commands,
      context: createTestContext({ name: 'test-cli' })
    }).buildScript();
  }

  describe(Provider.name, () => {
    for (
      const [label, description] of Object.entries(
        TEST_LABELS
      ) as [TestLabel, string][]
    ) {
      it(description, () => {
        const result = buildScript();

        assert.equal(result.entryPoint, '__test_cli__entry');
        assert.isNotEmpty(result.script);

        const { script } = result;

        for (const expected of expectations[label]) {
          assert.include(script, expected);
        }
      });
    }
  });
}
