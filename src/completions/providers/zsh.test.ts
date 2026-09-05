import { assert, describe, it } from 'vitest';

import { createCompletionCommands } from '../../../test/fixtures/commands.js';
import { createTestContext } from '../../tests.js';
import type { CommandTree } from '../provider.js';
import { ZshCompletionProvider } from './zsh.js';

function buildScript(commands: CommandTree = createCompletionCommands()) {
  return new ZshCompletionProvider({
    commands,
    context: createTestContext({ name: 'test-cli' })
  }).buildScript();
}

describe('ZshCompletionProvider', () => {
  it('builds a completion script', () => {
    const result = buildScript({});

    assert.equal(result.entryPoint, '__test_cli__entry');
    assert.isNotEmpty(result.script);
  });

  it('builds functions for groups and handlers', () => {
    const { script } = buildScript();

    assert.include(script, '__test_cli__command__bare() {');
    assert.include(script, '__test_cli__command__flags() {');
    assert.include(script, '__test_cli__command__group() {');
  });

  it('builds functions for nested handlers', () => {
    const { script } = buildScript();

    assert.include(script, '__test_cli__command__group__nested() {');

    assert.include(
      script,
      "'nested' __test_cli__command__group__nested ;;"
    );
  });

  it('completes boolean flags in positive and negative form', () => {
    const { script } = buildScript();

    assert.include(script, "'--disabled[@disabled]'");
    assert.include(script, "'--no-enabled[@enabled]'");
  });

  it('completes scalar flags', () => {
    const { script } = buildScript();

    assert.include(script, "'--count[@count]:number:");
    assert.include(script, "'--title[@title it");
    assert.include(script, "'--root[@root]:string:");
  });

  it('completes choice flags', () => {
    const { script } = buildScript();

    assert.include(script, "'--mode[@mode]:choice:(");
    assert.include(script, 'mode-alfa');
    assert.include(script, 'mode-bravo');
  });

  it('uses user-provided completion functions', () => {
    const { script } = buildScript();

    assert.include(
      script,
      "__test_cli__user_fn '\\''group:nested:custom'\\''"
    );
  });

  it('quotes values used in the generated script', () => {
    const { script } = buildScript();

    assert.include(script, "#compdef 'test-cli'");
    assert.include(script, "'group:@group @newline'");
    assert.include(script, '\\[value\\]');
    assert.include(script, "it'\\''s a:");
    assert.include(script, 'mode-bravo');
    assert.include(script, '__test_cli__entry "$@"');
  });
});
