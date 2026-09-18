import { assert, describe, it } from 'vitest';

import { applyMiddleware, buildMiddleware } from './commands/middleware.ts';
import type { CommandTree } from './commands/types.ts';
import { OperationalError } from './errors.ts';
import C from './factory.ts';
import {
  checkConversion,
  createTestContext,
  description,
  ensure,
  handler
} from './tests.ts';
import {
  isValidCommandName,
  isValidFlagName,
  validateCommands
} from './validation.ts';

const context = createTestContext();

function testIdentifiers(validate: (name: string) => boolean) {
  checkConversion<string, boolean>(
    (name, expected, message) =>
      assert.equal(validate(name), expected, message),
    [
      ['a', true],
      ['command', true],
      ['my-command', true],
      ['cmd2', true],
      ['', false],
      ['Command', false],
      ['my_command', false],
      ['my--command', false],
      ['-flag', false],
      ['--flag', false],
      ['1cmd', false],
      ['cmd$', false],
      ['cmd-', false],
      ['alfa.bravo', false],
      ['alfa bravo', false]
    ]
  );
}

describe('isValidCommandName', () => {
  it('only accepts valid command names', () => {
    testIdentifiers(isValidCommandName);
  });
});

describe('isValidFlagName', () => {
  it('only accepts valid flag names', () => {
    testIdentifiers(isValidFlagName);
  });

  it('rejects names reserved for boolean negation', () => {
    assert.isFalse(isValidFlagName('no-verbose'));
  });
});

describe('validateCommands', () => {
  function checkError(fn: () => void, message: string) {
    try {
      fn();
      assert.fail('Expected validation to fail');
    } catch (error) {
      assert.instanceOf(error, OperationalError);
      assert.equal(error.message, message);
    }
  }

  it('accepts a valid command tree', () => {
    assert.doesNotThrow(() =>
      validateCommands({
        parent: C.group(description, {
          child: C(
            description,
            { flag: C.flag('string', description) },
            handler
          )
        })
      }, context)
    );
  });

  it('accepts a deeply nested command tree', () => {
    let commands: CommandTree = {};

    for (let i = 5000; i >= 0; i--) {
      commands = { [`command-${i}`]: C.group(description, commands) };
    }

    assert.doesNotThrow(() => validateCommands(commands, context));
  });

  it('rejects flags that conflict with core flags', () => {
    ensure.throws(
      () =>
        validateCommands(
          {
            command: C(
              description,
              { help: C.flag('string', description) },
              handler
            )
          },
          context
        ),
      'internal use'
    );
  });

  it('allows a version flag on commands', () => {
    assert.doesNotThrow(() =>
      validateCommands({
        command: C(
          description,
          { version: C.flag('string', description) },
          handler
        )
      }, context)
    );
  });

  it('reports root command names without handlers', () => {
    checkError(
      () => validateCommands({ absent: undefined }, context),
      'No definition for command: absent'
    );
  });

  it('reports nested command names without handlers', () => {
    checkError(
      () =>
        validateCommands({
          parent: C.group(description, { child: undefined })
        }, context),
      'No definition for command: parent > child'
    );
  });

  it('reports invalid root command names', () => {
    checkError(
      () =>
        validateCommands({
          Wrong: C(description, handler)
        }, context),
      'Invalid command name: Wrong'
    );
  });

  it('reports invalid nested command names', () => {
    checkError(
      () =>
        validateCommands({
          parent: C.group(description, {
            'bad child': C(description, handler)
          })
        }, context),
      'Invalid command name: parent > bad child'
    );
  });

  it('reports invalid flag names with the command path', () => {
    checkError(
      () =>
        validateCommands({
          parent: C.group(description, {
            leaf: C(
              description,
              { BadFlag: C.flag('string', description) },
              handler
            )
          })
        }, context),
      'Invalid flag --BadFlag on command: parent > leaf'
    );
  });

  it('reports the first middleware flag conflict', () => {
    const timing = 'Time command execution';

    checkError(
      () =>
        validateCommands(
          applyMiddleware(
            [
              buildMiddleware(
                'Log command output',
                { verbose: { description, type: 'boolean' } },
                async next => next()
              ),
              buildMiddleware(
                timing,
                { verbose: { description, type: 'boolean' } },
                async next => next()
              )
            ],
            C.tree({
              alfa: C(description, handler),
              bravo: C(description, handler)
            })
          ),
          context
        ),
      `Failed to apply middleware: ${timing}\nThe --verbose flag is already present on command: alfa`
    );
  });

  it('reports flag names that start with the boolean negation prefix', () => {
    ensure.throws(
      () =>
        validateCommands({
          command: C(
            description,
            { 'no-verbose': C.flag('boolean', description) },
            handler
          )
        }, context),
      e => {
        assert.instanceOf(e, OperationalError);

        assert.equal(
          e.message,
          'Invalid flag --no-verbose on command: command\nFlag names cannot start with "no-"'
        );
      }
    );
  });
});
