import { assert, describe, it } from 'vitest';

import { formatScript } from './script.js';

describe('formatScript', () => {
  it('flattens lines', () => {
    assert.deepEqual(formatScript(['alfa', 'bravo']), 'alfa\nbravo');
  });

  it('applies indentation to nested groups', () => {
    assert.deepEqual(
      formatScript(['alfa', ['bravo', 'charlie'], 'delta'], 4),
      'alfa\n    bravo\n    charlie\ndelta'
    );
  });

  it('applies indentation to deeply nested line groups', () => {
    assert.deepEqual(
      formatScript(['alfa', ['bravo', ['charlie', 'delta']], 'echo'], 2),
      'alfa\n  bravo\n    charlie\n    delta\necho'
    );
  });
});
