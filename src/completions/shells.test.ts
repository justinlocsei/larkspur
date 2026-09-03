import { assert, describe, it } from 'vitest';

import { checkConversion } from '../tests.js';
import type { EnvironmentVariables } from '../types.js';
import type { SupportedShell } from './shells.js';
import {
  detectShell,
  getShellMetadata,
  listShells,
  SHELL_VARIABLES
} from './shells.js';

describe('detectShell', () => {
  it('uses environment variables to detect a supported shell', () => {
    checkConversion<EnvironmentVariables, SupportedShell | undefined>(
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

describe('getShellMetadata', () => {
  it('exposes metadata for a supported shell', () => {
    const meta = getShellMetadata('bash');

    assert.include(meta.profiles, '~/.bashrc');
    assert.include(meta.environmentVariables, 'BASH_VERSION');
  });
});

describe('listShells', () => {
  it('lists all available shells with support for completions', () => {
    assert.sameMembers(listShells().map(s => s.name), ['bash']);
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
