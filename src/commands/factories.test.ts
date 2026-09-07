import { assert, describe, it } from 'vitest';

import { T } from '../tests.ts';
import {
  buildCommandGroup,
  buildCommandHandler,
  buildCommandTree
} from './factories.ts';

const description = 'description';
const handler = async () => {};

describe('buildCommandHandler', () => {
  it('can define a command handler from a request object', () => {
    const command = buildCommandHandler({ description, handler, hidden: true });

    assert.equal(command.description, description);
    assert.equal(command.type, 'handler');
    assert.isFunction(command.handler);
    assert.isTrue(command.hidden);
  });

  it('can define a command handler that accepts unused arguments', () => {
    const command = buildCommandHandler({
      allowUnused: true,
      description,
      handler
    });

    assert.equal(command.allowUnused, true);
  });

  it('can define a command handler from a description and handler', () => {
    const command = buildCommandHandler(description, handler);

    assert.equal(command.description, description);
    assert.equal(command.type, 'handler');
    assert.isFunction(command.handler);
  });

  it('can define a command handler from a description, flags, and handler', () => {
    const command = buildCommandHandler(
      description,
      { string: { description, type: 'string' } },
      handler
    );

    assert.equal(command.description, description);
    assert.equal(command.type, 'handler');
    assert.isDefined(command.flags);
    assert.isDefined(command.flags?.string);
  });

  it('provides handlers with narrow type information for flags', () => {
    buildCommandHandler({
      description,
      flags: {
        boolean: { description, type: 'boolean' },
        number: { description, type: 'number' },
        string: { description, type: 'string' }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              boolean: boolean;
              number?: number;
              string?: string;
            }
          >
        >(true);
      }
    });
  });

  it('guarantees the presence of required flags in handlers', () => {
    buildCommandHandler(
      description,
      {
        boolean: { description, type: 'boolean' },
        number: { description, required: true, type: 'number' },
        string: { description, required: true, type: 'string' }
      },
      async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              boolean: boolean;
              number: number;
              string: string;
            }
          >
        >(true);
      }
    );
  });
});

describe('buildCommandGroup', () => {
  it('can define a command group from a request object', () => {
    const group = buildCommandGroup({
      description,
      subcommands: {
        child: buildCommandHandler(description, handler)
      }
    });

    assert.equal(group.description, description);
    assert.equal(group.type, 'group');
    assert.isDefined(group.subcommands.child);
  });

  it('can define a command group from a description and subcommands', () => {
    const group = buildCommandGroup(description, {
      child: buildCommandHandler(description, handler)
    });

    assert.equal(group.description, description);
    assert.equal(group.type, 'group');
    assert.isDefined(group.subcommands.child);
  });
});

describe('buildCommandTree', () => {
  it('returns the given command tree', () => {
    const tree = buildCommandTree({
      child: buildCommandHandler(description, handler)
    });

    const { child } = tree;

    assert.isDefined(child);
    assert.equal(child.description, description);
    assert.equal(child.type, 'handler');
  });
});
