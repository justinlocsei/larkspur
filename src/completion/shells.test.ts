import { assert, describe, it } from 'vitest';

import { createTestContext } from '../tests.js';
import type { CompletionSource } from './provider.js';
import { buildInstallInstructions, buildShellCompletions } from './shells.js';

const cli: CompletionSource = {
  commands: {},
  context: createTestContext({ name: 'test-cli' })
};

describe('buildShellCompletions', () => {
  it('supports bash', () => {
    assert.include(buildShellCompletions('bash', cli), 'COMPREPLY');
  });
});

describe('buildInstallInstructions', () => {
  it('includes profile paths from the shell provider', () => {
    assert.equal(
      buildInstallInstructions('bash', cli),
      [
        'Add this line to your bash profile (~/.bashrc or ~/.bash_profile):',
        '',
        '  eval "$(test-cli completions generate --shell bash)"',
        '',
        'To use these completions, reload your profile or start a new shell.'
      ].join('\n')
    );
  });
});
