import { assert, describe, it } from 'vitest';

import C from '../factory.ts';
import type { UserCompletion } from '../flags/types.ts';
import { createTestContext, description, handler } from '../tests.ts';
import {
  decodeFlagPath,
  encodeFlagPath,
  provideCompletions
} from './custom.ts';
import type { CompletionSource } from './provider.ts';

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
  const withCompletion = (fn: UserCompletion): CompletionSource => ({
    commands: {
      command: C(
        description,
        {
          invalid: C.flag('string', description),
          valid: C.flag('string', description, { completion: fn })
        },
        handler
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

  it('supports sync completion functions', async () => {
    const result = await provideCompletions(
      withCompletion(() => ['alfa', 'bravo']),
      { current: '', flag: 'command:valid' }
    );

    assert.equal(result, 'alfa\nbravo\n');
  });

  it('supports grouped completion functions', async () => {
    const result = await provideCompletions(
      {
        commands: {
          outer: C.group(description, {
            inner: C(
              description,
              {
                command: C.flag('string', description, {
                  completion: () => ['alfa', 'bravo']
                })
              },
              handler
            )
          })
        },
        context: createTestContext()
      },
      { current: '', flag: 'outer:inner:command' }
    );

    assert.equal(result, 'alfa\nbravo\n');
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
