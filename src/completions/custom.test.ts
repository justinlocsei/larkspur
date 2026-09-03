import { assert, describe, it } from 'vitest';

import C from '../factory.js';
import type { UserCompletion } from '../flags/types.js';
import { createTestContext } from '../tests.js';
import {
  decodeFlagPath,
  encodeFlagPath,
  provideCompletions
} from './custom.js';

const description = 'description';

describe('decodeFlagPath', () => {
  it('decodes a path to a command flag', () => {
    const command = ['alfa-one', 'bravo'];

    assert.deepEqual(decodeFlagPath(encodeFlagPath(command, 'region')), {
      command,
      flag: 'region'
    });
  });

  it('rejects malformed paths', () => {
    for (const path of ['', ':region', 'alfa:', 'alfa::region']) {
      assert.isUndefined(decodeFlagPath(path), `allowed path: ${path}`);
    }
  });
});

describe('encodeFlagPath', () => {
  it('encodes a path to a command flag', () => {
    assert.equal(
      encodeFlagPath(['alfa-one', 'bravo'], 'region'),
      'alfa-one:bravo:region'
    );
  });
});

describe('provideCompletions', () => {
  const withCompletion = (fn: UserCompletion) => ({
    commands: {
      command: C(
        description,
        {
          invalid: C.flag('string', description),
          valid: C.flag('string', description, { completion: fn })
        },
        async () => {}
      )
    },
    context: createTestContext()
  });

  it('calls the completion function and formats its values', () => {
    const result = provideCompletions(
      withCompletion(({ current }) => [
        `${current}-one`,
        `${current}-two`
      ]),
      {
        current: 'alfa',
        flag: 'command:valid',
        shell: 'bash'
      }
    );

    assert.equal(result, 'alfa-one\0alfa-two');
  });

  it('returns an empty string for invalid providers', () => {
    const result = provideCompletions(
      withCompletion(() => {
        throw new Error('failed');
      }),
      {
        current: '',
        flag: 'command:valid',
        shell: 'bash'
      }
    );

    assert.equal(result, '');
  });

  it('returns an empty string for invalid flag paths', () => {
    const flags = [
      'not-command',
      'command',
      'command:invalid',
      'command:extra'
    ];

    for (const flag of flags) {
      const result = provideCompletions(
        withCompletion(() => ['test']),
        {
          current: '',
          flag,
          shell: 'bash'
        }
      );

      assert.equal(result, '', `allowed flag: ${flag}`);
    }
  });
});
