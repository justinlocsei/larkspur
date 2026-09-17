import { assert, describe, it } from 'vitest';

import C from './factory.ts';
import { description, handler, T } from './tests.ts';

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

describe('C.flags', () => {
  it('can define a set of flags', () => {
    const flags = C.flags({
      alfa: C.flag('boolean', 'alfa'),
      bravo: C.flag('boolean', 'bravo')
    });

    T.assert<T.Equivalent<keyof typeof flags, 'alfa' | 'bravo'>>(true);

    assert.equal(flags.alfa.type, 'boolean');
    assert.equal(flags.bravo.type, 'boolean');

    assert.equal(flags.alfa.description, 'alfa');
    assert.equal(flags.bravo.description, 'bravo');
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

describe('C.tree', () => {
  it('returns a command tree', () => {
    const tree = C.tree({
      alfa: C.group(description, {
        bravo: C(description, handler)
      })
    });

    assert.isDefined(tree.alfa);
    assert(tree.alfa.type === 'group');
    assert.isNotEmpty(tree.alfa.subcommands);
  });
});
