import { testProvider } from './tests.js';
import { ZshCompletionProvider } from './zsh.js';

testProvider(ZshCompletionProvider, {
  booleans: [
    "'--disabled[@disabled]'",
    "'--no-enabled[@enabled]'"
  ],
  choices: [
    "'--mode[@mode]:choice:(",
    'mode-alfa',
    'mode-bravo'
  ],
  custom: [
    "__test_cli__user_fn '\\''group:nested:custom'\\''"
  ],
  groups: [
    '__test_cli__command__bare() {',
    '__test_cli__command__flags() {',
    '__test_cli__command__group() {'
  ],
  nested: [
    '__test_cli__command__group__nested() {',
    "'nested') __test_cli__command__group__nested ;;"
  ],
  quoting: [
    "#compdef 'test-cli'",
    "'group:@group @newline'",
    '\\[value\\]',
    "it'\\''s a:",
    'mode-bravo',
    '__test_cli__entry "$@"'
  ],
  scalars: [
    "'--count[@count]:number:",
    "'--title[@title it",
    "'--root[@root]:string:"
  ]
});
