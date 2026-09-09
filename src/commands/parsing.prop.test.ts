import { fc, test } from '@fast-check/vitest';
import { assert } from 'vitest';

import C from '../factory.ts';
import { argv, identifier, singleCommand } from '../tests/properties.ts';
import { parseCommand } from './parsing.ts';
import type { CommandTree } from './types.ts';

const description = 'description';
const handler = async () => {};

test.prop([singleCommand])(
  'valid command names resolve to handlers',
  command => {
    const result = parseCommand([command.name], command.tree);

    assert.equal(result.type, 'command');
  }
);

test.prop([argv, singleCommand])(
  'unknown arguments after a valid command can be permitted',
  (args, command) => {
    const result = parseCommand([command.name, ...args], {
      [command.name]: C({
        allowExtraArgs: true,
        description,
        handler
      })
    });

    assert.equal(result.type, 'command');
  }
);

test.prop([
  fc.uniqueArray(identifier, { minLength: 2, maxLength: 200 })
])(
  'wide command trees are supported',
  names => {
    const commands = Object.fromEntries(
      names.map(name => [name, C(description, handler)])
    );

    const command = names[0];
    assert.isDefined(command, 'no command available');

    const result = parseCommand([command], commands);
    assert.equal(result.type, 'command');
  }
);

test.prop([
  fc.uniqueArray(identifier, { minLength: 2, maxLength: 200 })
])(
  'deep command trees are supported',
  names => {
    const leaf = names.at(-1);
    assert.isDefined(leaf, 'no leaf command available');

    let commands: CommandTree = {
      [leaf]: C(description, handler)
    };

    for (let i = names.length - 2; i >= 0; i--) {
      const branch = names[i];
      assert.isDefined(branch, 'no branch command available');

      commands = { [branch]: C.group(description, commands) };
    }

    const result = parseCommand(names, commands);
    assert.equal(result.type, 'command');
  }
);
