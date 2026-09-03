import { assert, describe, it } from 'vitest';

import C from '../factory.js';
import { getCommand, visibleCommands } from './data.js';

const handler = async () => {};

describe('getCommand', () => {
  it('returns undefined for inherited object property names', () => {
    const tree = {
      testing: C('testing', handler)
    };

    assert.isUndefined(getCommand(tree, 'constructor'));
  });

  it('returns defined commands by name', () => {
    const command = C('testing', handler);
    const tree = { testing: command };

    assert.equal(getCommand(tree, 'testing'), command);
  });
});

describe('visibleCommands', () => {
  it('filters hidden command handlers', () => {
    const tree = {
      group: C.group('group', {
        nested: C({ description: 'visible', handler, hidden: true }),
        other: C('hidden', handler)
      }),
      hidden: C({ description: 'hidden', handler, hidden: true }),
      visible: C('visible', handler)
    };

    const filtered = visibleCommands(tree);
    const { group } = filtered;

    assert.sameMembers(
      Object.keys(filtered),
      ['group', 'visible'],
      'root filtering failed'
    );

    assert.isDefined(group);
    assert(group.type === 'group');

    assert.sameMembers(
      Object.keys(group.subcommands),
      ['nested', 'other'],
      'recursive filtering detected'
    );

    assert.sameMembers(
      Object.keys(visibleCommands(tree.group.subcommands)),
      ['other'],
      'nested filtering failed'
    );
  });
});
