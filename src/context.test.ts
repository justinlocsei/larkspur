import { assert, describe, it } from 'vitest';

import { createContext } from './context.js';

describe('createContext', () => {
  it('combines metadata with configuration', () => {
    assert.deepEqual(
      createContext({ name: 'alfa' }),
      {
        config: {
          completion: {
            enabled: true
          },
          help: {
            formatting: {
              gutter: 2,
              indent: 2
            }
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
        { completion: { enabled: true }, help: { formatting: { indent: 4 } } }
      ),
      {
        config: {
          completion: {
            enabled: true
          },
          help: {
            formatting: {
              gutter: 2,
              indent: 4
            }
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
