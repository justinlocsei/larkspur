import { assert, describe, it } from 'vitest';

import { checkConversion, createTestContext } from '../../tests.ts';
import type { FunctionType } from '../fns.ts';
import { testProvider } from './tests.ts';
import { ZshCompletionProvider } from './zsh.ts';

describe('createNameGenerator', () => {
  it('produces names for completion functions', () => {
    checkConversion<[FunctionType, string[]], string>(
      (i, o, m) =>
        assert.equal(
          ZshCompletionProvider.createNameGenerator('test-cli')(i[0], i[1]),
          o,
          m
        ),
      [
        [['command', ['my-cmd']], '_test-cli__command__my-cmd'],
        [['entry', []], '_test-cli'],
        [
          ['command', ['group', 'nested']],
          '_test-cli__command__group__nested'
        ],
        [
          ['user_fn', ['alfa', 'br avo']],
          '_test-cli__user_fn__alfa__br avo'
        ]
      ]
    );
  });
});

describe('buildInstallationInstructions', () => {
  it('shows installation instructions', () => {
    const instructions = new ZshCompletionProvider({
      commands: {},
      context: createTestContext({ name: 'test-cli' })
    }).buildInstallationInstructions();

    assert.equal(
      instructions,
      `
Ensure that test-cli is available on your PATH, then add the following to your zsh profile (~/.zshrc):

  autoload -Uz compinit
  compinit

  source <(test-cli completions generate --shell zsh)>

Completions will be generated each time you start an interactive shell.

To install a static completion file for fpath autoloading instead, save
the generated script and refresh it when the CLI changes:

  mkdir -p ~/.zsh/completions
  test-cli completions generate --shell zsh > ~/.zsh/completions/_test-cli

Then add this line before loading compinit:

  fpath=(~/.zsh/completions $fpath)`.trim()
    );
  });
});

testProvider(ZshCompletionProvider, {
  entryPoint: '_test-cli',
  booleans: [
    "'--disabled[@disabled]'",
    "'--no-enabled[@enabled]'"
  ],
  choices: [
    "'--mode=[@mode]:choice:(",
    'mode-alfa',
    'mode-bravo'
  ],
  custom: [
    '_test-cli__user_fn__group__nested__custom() {',
    "provide --flag 'group:nested:custom'"
  ],
  groups: [
    '_test-cli__command__bare() {',
    '_test-cli__command__flags() {',
    '_test-cli__command__group() {',
    "_describe 'option' flag_names",
    "'--explore:Recursively list commands and flags'",
    "'--help:Show help'"
  ],
  nested: [
    '_test-cli__command__group__nested() {',
    "'nested') _test-cli__command__group__nested ;;"
  ],
  resolvedFlags: [
    '[[ "$words[CURRENT-1]" == (--count|--custom|--file|--mode|--title) ]]',
    '[[ "$words[CURRENT]" == --* ]] && [[ "$words[CURRENT]" != (--disabled|--no-enabled|--help) ]]'
  ],
  quoting: [
    "#compdef 'test-cli'",
    "compdef _test-cli 'test-cli'",
    "'group:@group @newline'",
    '\\[value\\]',
    "it'\\''s a:",
    'mode-bravo',
    '(( $# )) && _test-cli "$@"'
  ],
  scalars: [
    "'*--count=[@count]:number:",
    "'--file=[@file]:path:_files",
    "'--title=[@title it",
    ':string:_nothing',
    "'--root=[@root]:string:"
  ]
});
