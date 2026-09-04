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

  it('calls the completion function and formats its values', async () => {
    const result = await provideCompletions(
      withCompletion(({ current }) => [
        `${current}-one`,
        `${current}-two`
      ]),
      { current: 'alfa', flag: 'command:valid' }
    );

    assert.equal(result, 'alfa-one\nalfa-two\n');
  });

  it('returns an empty string for invalid providers', async () => {
    const result = await provideCompletions(
      withCompletion(() => {
        throw new Error('failed');
      }),
      { current: '', flag: 'command:valid' }
    );

    assert.equal(result, '');
  });

  it('returns an empty string for invalid flag paths', async () => {
    const flags = [
      'not-command',
      'command',
      'command:invalid',
      'command:extra'
    ];

    for (const flag of flags) {
      const result = await provideCompletions(
        withCompletion(() => ['test']),
        { current: '', flag }
      );

      assert.equal(result, '', `allowed flag: ${flag}`);
    }
  });
});
