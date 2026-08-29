import { assert, describe, it } from 'vitest';

import { buildCompletions } from './completion.js';
import C from './factory.js';

describe('buildCompletions', () => {
  it('supports bash', () => {
    const script = buildCompletions('bash', {
      commands: { noop: C('', async () => {}) },
      name: 'test-cli-name'
    });

    assert.match(script, /^complete.*test-cli-name$/m);
  });
});
