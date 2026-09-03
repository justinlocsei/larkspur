import { assert, describe, it } from 'vitest';

import type { ScriptLines } from './script.js';
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

  it('supports deeply nested lines', () => {
    let lines: ScriptLines = [];

    for (let i = 0; i < 4000; i++) {
      lines = [[i.toString(), ...lines]];
    }

    assert.isString(formatScript(lines, 2));
  });
});
