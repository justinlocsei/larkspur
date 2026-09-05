import { assert, describe, it } from 'vitest';

import { createCompletionCommands } from '../../../test/fixtures/commands.js';
import { createTestContext } from '../../tests.js';
import type { CommandTree } from '../provider.js';
import { BashCompletionProvider } from './bash.js';

function buildScript(commands: CommandTree = createCompletionCommands()) {
  return new BashCompletionProvider({
    commands,
    context: createTestContext({ name: 'test-cli' })
  }).buildScript();
}

describe('BashCompletionProvider', () => {
  it('builds a completion script', () => {
    const result = buildScript({});

    assert.equal(result.entryPoint, '__test_cli__entry');
    assert.isNotEmpty(result.script);
  });

  it('builds functions for groups and handlers', () => {
    const { script } = buildScript();

    assert.include(script, '__test_cli__command() {');
    assert.include(script, '__test_cli__command__bare() {');
    assert.include(script, '__test_cli__command__flags() {');
    assert.include(script, '__test_cli__command__group() {');
  });

  it('builds functions for nested handlers', () => {
    const { script } = buildScript();

    assert.include(script, '__test_cli__command__group__nested() {');

    assert.include(
      script,
      'group) __test_cli__command__group $next "$2" "$3" "$4" ;;'
    );
  });

  it('completes boolean flags in positive and negative form', () => {
    const { script } = buildScript();

    assert.include(script, "'--disabled'");
    assert.include(script, "'--no-enabled'");
  });

  it('completes scalar flags', () => {
    const { script } = buildScript();

    assert.include(script, '--count=*)');
    assert.include(script, '--title=*)');
  });

  it('completes choice flags', () => {
    const { script } = buildScript();

    assert.include(script, "'mode-alfa'");
    assert.include(script, "'mode-bravo'");
  });

  it('uses user-provided completion functions', () => {
    const { script } = buildScript();

    assert.include(script, "__test_cli__user_fn 'group:nested:custom'");
  });

  it('quotes values used in the generated script', () => {
    const { script } = buildScript();

    assert.include(
      script,
      "complete -o default -F __test_cli__entry 'test-cli'"
    );

    assert.include(script, "'mode-alfa'");
    assert.include(script, "'group:nested:custom'");
  });
});
