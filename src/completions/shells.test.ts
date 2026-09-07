import { assert, describe, it } from 'vitest';

import { getShellMetadata, listShells } from './shells.ts';

describe('getShellMetadata', () => {
  it('exposes metadata for a supported shell', () => {
    const meta = getShellMetadata('bash');

    assert.include(meta.profiles, '~/.bashrc');
    assert.equal(meta.signature, 'COMPREPLY');
  });
});

describe('listShells', () => {
  it('lists all available shells with support for completions', () => {
    assert.sameMembers(listShells().map(s => s.name), ['bash', 'zsh']);
  });
});
