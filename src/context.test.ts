import { assert, describe, it } from 'vitest';

import { createContext } from './context.ts';

describe('createContext', () => {
  it('combines metadata with configuration', () => {
    assert.deepEqual(
      createContext({ name: 'alfa' }),
      {
        config: {
          completions: {
            enabled: true,
            group: 'completions'
          },
          help: {
            indent: 2
          }
        },
        meta: {
          name: 'alfa'
        }
      }
    );
  });

  it('includes user-provided configuration data', () => {
    assert.deepEqual(
      createContext(
        { description: 'alfa', name: 'bravo' },
        { completions: { enabled: true }, help: { indent: 4 } }
      ),
      {
        config: {
          completions: {
            enabled: true,
            group: 'completions'
          },
          help: {
            indent: 4
          }
        },
        meta: {
          description: 'alfa',
          name: 'bravo'
        }
      }
    );
  });
});
