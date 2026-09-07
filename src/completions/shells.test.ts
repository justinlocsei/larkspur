import { assert, describe, it } from 'vitest';

import { checkConversion } from '../tests.ts';
import type { EnvironmentVariables } from '../types.ts';
import type { SupportedShell } from './shells.ts';
import {
  detectShell,
  getShellMetadata,
  listShells,
  SHELL_VARIABLES
} from './shells.ts';

describe('detectShell', () => {
  it('uses environment variables to detect a supported shell', () => {
    checkConversion<EnvironmentVariables, SupportedShell | undefined>(
      (input, output, message) =>
        assert.equal(detectShell(input), output, message),
      [
        [{ BASH_VERSION: '5.2' }, 'bash'],
        [{ BASH: '/bin/bash' }, 'bash'],
        [{ SHELL: '/bin/bash' }, undefined],
        [{}, undefined],
        [{ ZSH_VERSION: '5.9' }, 'zsh']
      ]
    );
  });
});

describe('getShellMetadata', () => {
  it('exposes metadata for a supported shell', () => {
    const meta = getShellMetadata('bash');

    assert.include(meta.profiles, '~/.bashrc');
    assert.include(meta.environmentVariables, 'BASH_VERSION');
  });
});

describe('listShells', () => {
  it('lists all available shells with support for completions', () => {
    assert.sameMembers(listShells().map(s => s.name), ['bash', 'zsh']);
  });
});

describe('SHELL_VARIABLES', () => {
  it('includes all supported shell environment variables', () => {
    assert.deepEqual(SHELL_VARIABLES, [
      'BASH',
      'BASH_VERSION',
      'ZSH_VERSION'
    ]);
  });
});
