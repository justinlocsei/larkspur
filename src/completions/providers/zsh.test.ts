import { assert, describe, it } from 'vitest';

import { checkConversion } from '../../tests.js';
import type { FunctionType } from '../fns.js';
import { testProvider } from './tests.js';
import { ZshCompletionProvider } from './zsh.js';

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
    '_test-cli__command__group() {'
  ],
  nested: [
    '_test-cli__command__group__nested() {',
    "'nested') _test-cli__command__group__nested ;;"
  ],
  resolvedFlags: [
    '[[ "$words[CURRENT-1]" == (--count|--custom|--mode|--title) ]]',
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
    "'--title=[@title it",
    "'--root=[@root]:string:"
  ]
});
