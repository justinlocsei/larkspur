import { assert, describe, it } from 'vitest';

import type { CompletionSource } from './provider.js';
import { BashCompletionProvider } from './providers/bash.js';
import { loadProvider } from './providers.js';

const cli: CompletionSource = {
  commands: {},
  name: 'testing'
};

describe('loadProvider', () => {
  it('returns a bash completion provider', () => {
    assert.instanceOf(loadProvider('bash', cli), BashCompletionProvider);
  });
});
