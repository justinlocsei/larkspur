import { assert, describe, it } from 'vitest';

import { checkConversion, createTestContext } from '../tests.js';
import type { CompletionShell, EnvironmentVariables } from '../types.js';
import {
  detectShell,
  getShellProfiles,
  SHELL_VARIABLES,
  useProvider
} from './providers.js';

describe('detectShell', () => {
  it('uses environment variables to detect a supported shell', () => {
    checkConversion<EnvironmentVariables, CompletionShell | undefined>(
      (input, output, message) =>
        assert.equal(detectShell(input), output, message),
      [
        [{ BASH_VERSION: '5.2' }, 'bash'],
        [{ BASH: '/bin/bash' }, 'bash'],
        [{ SHELL: '/bin/bash' }, undefined],
        [{}, undefined]
      ]
    );
  });
});

describe('getShellProfiles', () => {
  it('returns profile scripts for a supported shell', () => {
    assert.deepEqual(getShellProfiles('bash'), [
      '~/.bashrc',
      '~/.bash_profile'
    ]);
  });
});

describe('SHELL_VARIABLES', () => {
  it('includes all supported shell environment variables', () => {
    assert.deepEqual(SHELL_VARIABLES, [
      'BASH',
      'BASH_VERSION'
    ]);
  });
});

describe('useProvider', () => {
  it('creates a bash provider', () => {
    const provider = useProvider('bash', {
      commands: {},
      context: createTestContext()
    });

    assert.include(provider.buildScript().script, 'COMPREPLY');
  });
});
