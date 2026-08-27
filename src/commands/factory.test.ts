import { assert, describe, it } from 'vitest';

import * as T from '../tests/types.js';
import C from './factory.js';

const description = 'description';
const handler = async () => {};

describe('C', () => {
  it('can define a command handler from a request object', () => {
    const command = C({ description, handler });

    assert.equal(command.description, description);
    assert.equal(command.type, 'handler');
    assert.isFunction(command.handler);
  });

  it('can define a command handler from a description and handler', () => {
    const command = C(description, handler);

    assert.equal(command.description, description);
    assert.equal(command.type, 'handler');
    assert.isFunction(command.handler);
  });

  it('can define a command handler from a description, flags, and handler', () => {
    const command = C(
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
    C({
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
    C(
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

describe('C.group', () => {
  it('can define a command group from a request object', () => {
    const group = C.group({
      description,
      subcommands: {
        child: C(description, handler)
      }
    });

    assert.equal(group.description, description);
    assert.equal(group.type, 'group');
    assert.isDefined(group.subcommands.child);
  });

  it('can define a command group from a description and subcommands', () => {
    const group = C.group(description, {
      child: C(description, handler)
    });

    assert.equal(group.description, description);
    assert.equal(group.type, 'group');
    assert.isDefined(group.subcommands.child);
  });
});
