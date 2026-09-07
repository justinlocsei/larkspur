import { assert, describe, it } from 'vitest';

import type { ParsingResult } from '../commands/parsing.ts';
import { parseCommand } from '../commands/parsing.ts';
import type { EntryPoint } from '../commands/types.ts';
import C from '../factory.ts';
import { createTestContext, ensure } from '../tests.ts';
import {
  defineCompletionCommands,
  withCompletionCommands
} from './commands.ts';
import { listShells } from './shells.ts';

function runCompletionCommand(args: string[]): ParsingResult {
  return parseCommand(['completions', ...args], {
    completions: defineCompletionCommands()
  });
}

describe('defineCompletionCommands', () => {
  it('returns a command group', () => {
    const completions = defineCompletionCommands();

    assert(completions.type === 'group');
    assert.isNotEmpty(completions.subcommands);
  });

  describe('generate', () => {
    for (const shell of listShells()) {
      it(`generates a completion script for ${shell.name}`, async () => {
        const parsed = runCompletionCommand([
          'generate',
          '--shell',
          shell.name
        ]);

        assert(parsed.type === 'command', 'command not parsed');
        const run = await parsed.run(createTestContext());

        assert(run.type === 'success', 'command failed');
        assert.include(run.output, shell.signature);
      });
    }

    it('rejects unsupported shells', () => {
      const parsed = runCompletionCommand(['generate', '--shell', 'ksh']);

      assert(parsed.type === 'error', 'invalid shell was allowed');
      assert.include(parsed.message, '--shell');
    });
  });

  describe('install', () => {
    it('shows installation instructions', async () => {
      const parsed = runCompletionCommand(['install', '--shell', 'bash']);

      assert(parsed.type === 'command', 'command not parsed');
      const run = await parsed.run(createTestContext());

      assert(run.type === 'success', 'command failed');
      assert.include(run.output, '--shell bash');
    });

    it('requires a shell', () => {
      const parsed = runCompletionCommand(['install']);

      assert(parsed.type === 'error', 'missing shell was allowed');
      assert.include(parsed.message, 'shell');
    });
  });

  describe('provide', () => {
    it('returns values from a user completion', async () => {
      const parsed = parseCommand([
        'completions',
        'provide',
        '--flag',
        'command:value',
        '--current',
        'alfa',
        '--shell',
        'bash'
      ], {
        command: C(
          'description',
          {
            value: C.flag('string', 'description', {
              completion: ({ current }) => [`${current}-one`]
            })
          },
          async () => {}
        ),
        completions: defineCompletionCommands()
      });

      assert(parsed.type === 'command', 'command not parsed');
      const run = await parsed.run(createTestContext());

      assert(run.type === 'success', 'command failed');
      assert.equal(run.output, 'alfa-one\n');
    });

    it('returns an empty value when the flag cannot be resolved', async () => {
      const parsed = runCompletionCommand([
        'provide',
        '--flag',
        'missing:value',
        '--shell',
        'bash'
      ]);

      assert(parsed.type === 'command', 'command not parsed');
      const run = await parsed.run(createTestContext());

      assert(run.type === 'success', 'command failed');
      assert.equal(run.output, '');
    });
  });
});

describe('withCompletionCommands', () => {
  it('adds completion commands to the entry point', () => {
    const original: EntryPoint = {};

    const updated = withCompletionCommands(
      original,
      createTestContext({}, { completion: { group: 'completions' } })
    );

    assert.isDefined(updated.completions);
    assert.equal(updated.completions.type, 'group');

    assert.isEmpty(original);
  });

  it('preserves the entry point if completions are not enabled', () => {
    const entry = withCompletionCommands(
      {},
      createTestContext({}, { completion: { enabled: false } })
    );

    assert.isEmpty(entry);
  });

  it('throws an error if the completion group already exists', () => {
    ensure.throws(
      () =>
        withCompletionCommands(
          { testing: defineCompletionCommands() },
          createTestContext({}, { completion: { group: 'testing' } })
        ),
      'testing'
    );
  });
});
