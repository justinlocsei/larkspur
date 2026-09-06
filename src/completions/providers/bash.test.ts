import { BashCompletionProvider } from './bash.js';
import { testProvider } from './tests.js';

testProvider(BashCompletionProvider, {
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
