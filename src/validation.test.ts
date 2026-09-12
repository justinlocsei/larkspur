import { assert, describe, it } from 'vitest';

import type { CommandTree } from './commands/types.ts';
import { resolveConfig } from './config.ts';
import { OperationalError } from './errors.ts';
import C from './factory.ts';
import { checkConversion, ensure } from './tests.ts';
import {
  isValidCommandName,
  isValidFlagName,
  validateCommands
} from './validation.ts';

const config = resolveConfig();
const description = 'description';
const handler = async () => {};

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
      }, config)
    );
  });

  it('accepts a deeply nested command tree', () => {
    let commands: CommandTree = {};

    for (let i = 5000; i >= 0; i--) {
      commands = { [`command-${i}`]: C.group(description, commands) };
    }

    assert.doesNotThrow(() => validateCommands(commands, config));
  });

  it('rejects flags that conflict with core flags', () => {
    for (const flag of ['help']) {
      ensure.throws(
        () =>
          validateCommands(
            {
              command: C(
                description,
                { [flag]: C.flag('string', description) },
                handler
              )
            },
            resolveConfig()
          ),
        'internal use'
      );
    }
  });

  it('reports invalid root command names', () => {
    checkError(
      () =>
        validateCommands({
          Wrong: C(description, handler)
        }, config),
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
        }, config),
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
        }, config),
      'Invalid flag --BadFlag on command: parent > leaf'
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
        }, config),
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
