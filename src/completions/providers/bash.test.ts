import { assert, describe, it } from 'vitest';

import { checkConversion, createTestContext } from '../../tests.ts';
import type { FunctionType } from '../fns.ts';
import { BashCompletionProvider } from './bash.ts';
import { testProvider } from './tests.ts';

describe('createNameGenerator', () => {
  it('produces names for completion functions', () => {
    checkConversion<[FunctionType, string[]], string>(
      (i, o, m) =>
        assert.equal(
          BashCompletionProvider.createNameGenerator('test-cli')(i[0], i[1]),
          o,
          m
        ),
      [
        [['command', ['my-cmd']], '__test_cli__command__my_cmd'],
        [['entry', []], '__test_cli__entry'],
        [
          ['command', ['group', 'nested']],
          '__test_cli__command__group__nested'
        ],
        [['user_fn', ['alfa', 'br avo']], '__test_cli__user_fn__alfa__br_avo'],
        [['words', []], '__test_cli__words']
      ]
    );
  });
});

describe('buildInstallationInstructions', () => {
  it('shows installation instructions', () => {
    const instructions = new BashCompletionProvider({
      commands: {},
      context: createTestContext({ name: 'test-cli' })
    }).buildInstallationInstructions();

    assert.equal(
      instructions,
      `
Ensure that test-cli is available on your PATH, then add this line to your bash profile (~/.bashrc or ~/.bash_profile):

  eval "$(test-cli completions generate --shell bash)"

To use these completions, reload your profile or start a new shell.`.trim()
    );
  });
});

testProvider(BashCompletionProvider, {
  entryPoint: '__test_cli__entry',
  booleans: [
    "'--disabled'",
    "'--no-enabled'"
  ],
  choices: [
    "'mode-alfa'",
    "'mode-bravo'"
  ],
  custom: [
    "__test_cli__user_fn 'group:nested:custom'"
  ],
  groups: [
    '__test_cli__command() {',
    '__test_cli__command__bare() {',
    '__test_cli__command__flags() {',
    '__test_cli__command__group() {'
  ],
  nested: [
    '__test_cli__command__group__nested() {',
    'group) __test_cli__command__group $next "$2" "$3" "$4" ;;'
  ],
  quoting: [
    "complete -o default -F __test_cli__entry 'test-cli'",
    "'mode-alfa'",
    "'group:nested:custom'"
  ],
  resolvedFlags: [],
  scalars: [
    '--count=*)',
    '--title=*)'
  ]
});
