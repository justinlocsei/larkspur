import { assert, describe, it } from 'vitest';

import type { CommandTree } from '../../commands/types.ts';
import C from '../../factory.ts';
import { createTestContext } from '../../tests.ts';
import type { CompletionProviderClass } from '../provider.ts';

/**
 * Create commands that cover the essential parts of the completion system
 */
function createCompletionCommands(): CommandTree {
  return {
    bare: C('@bare-handler', async () => {}),
    flags: C(
      '@flag-handler',
      { root: C.flag('string', '@root') },
      async () => {}
    ),
    group: C.group('@group\n@newline', {
      nested: C(
        '@nested',
        {
          count: C.flag('number', '@count', { repeatable: true }),
          custom: C.flag('string', '@custom', {
            completion: async () => ['custom-alfa', 'custom-bravo']
          }),
          disabled: C.flag('boolean', '@disabled'),
          enabled: C.flag('boolean', '@enabled', { default: true }),
          file: C.flag('path', '@file'),
          mode: C.flag('choice', '@mode', {
            choices: ['mode-alfa', 'mode-bravo']
          }),
          title: C.flag('string', "@title it's a: [value]")
        },
        async () => {}
      )
    })
  };
}

const TEST_LABELS = {
  booleans: 'completes boolean flags in positive and negative form',
  choices: 'completes choice flags',
  custom: 'calls user-provided completion functions',
  groups: 'builds functions for groups and handlers',
  nested: 'builds functions for nested handlers',
  quoting: 'quotes values used in the generated script',
  resolvedFlags: 'prompts for flags after a value is resolved',
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
  expectations: Record<TestLabel, string[]> & { entryPoint: string }
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
      const expected = expectations[label];

      if (!expected.length) {
        continue;
      }

      it(description, () => {
        const result = buildScript();

        assert.equal(result.entryPoint, expectations.entryPoint);
        assert.isNotEmpty(result.script);

        const { script } = result;

        for (const value of expected) {
          assert.include(script, value);
        }
      });
    }
  });
}
