import { assert, describe, it } from 'vitest';

import C from './factory.js';

const description = 'description';
const handler = async () => {};

describe('C', () => {
  it('can define a command handler', () => {
    const command = C(
      description,
      { string: C.flag('string', description) },
      handler
    );

    assert.equal(command.description, description);
    assert.equal(command.type, 'handler');
    assert.isDefined(command.flags);
    assert.isDefined(command.flags?.string);
  });
});

describe('C.flag', () => {
  it('can define a flag', () => {
    assert.deepEqual(C.flag('boolean', description), {
      description,
      type: 'boolean'
    });
  });
});

describe('C.group', () => {
  it('can define a command group', () => {
    const group = C.group(description, {
      child: C(description, handler)
    });

    assert.equal(group.description, description);
    assert.equal(group.type, 'group');
    assert.isDefined(group.subcommands.child);
  });
});
