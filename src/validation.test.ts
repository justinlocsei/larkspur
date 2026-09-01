import { assert, describe, it } from 'vitest';

import { OperationalError } from './errors.js';
import C from './factory.js';
import { checkConversion, ensure } from './tests.js';
import {
  isValidCommandName,
  isValidFlagName,
  validateCommands
} from './validation.js';

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
      })
    );
  });

  it('reports invalid root command names', () => {
    checkError(
      () =>
        validateCommands({
          Wrong: C(description, handler)
        }),
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
        }),
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
        }),
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
        }),
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
