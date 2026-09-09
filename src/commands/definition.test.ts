import { assert, describe, it } from 'vitest';

import C from '../factory.ts';
import { T } from '../tests.ts';
import { defineCommandGroup, defineCommandHandler } from './definition.ts';

const description = 'description';
const handler = async () => {};

describe('defineCommand', () => {
  it('can define a command handler', () => {
    const command = defineCommandHandler({ description, handler });

    assert.equal(command.description, description);
    assert.isFunction(command.handler);
  });

  it('can define a command group', () => {
    const group = defineCommandGroup({
      description,
      subcommands: {
        child: defineCommandHandler({
          description: 'Child',
          handler
        })
      }
    });

    assert.equal(group.description, description);
    assert.isDefined(group.subcommands);

    const { subcommands } = group;

    assert.isDefined(subcommands.child);
    assert.equal(subcommands.child.description, 'Child');
  });

  it('defines handlers that can access typed flags', () => {
    defineCommandHandler({
      description,
      flags: {
        boolean: C.flag('boolean', description),
        number: C.flag('number', description),
        path: C.flag('path', description),
        string: C.flag('string', description)
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              boolean: boolean;
              number?: number;
              path?: string;
              string?: string;
            }
          >
        >(true);
      }
    });
  });

  it('guarantees the presence of values for flags with defaults', () => {
    defineCommandHandler({
      description,
      flags: {
        boolean: C.flag('boolean', description, { default: true }),
        number: C.flag('number', description, { default: 1 }),
        onumber: C.flag('number', description),
        ostring: C.flag('string', description),
        string: C.flag('string', description, { default: 'Value' })
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              boolean: boolean;
              number: number;
              onumber?: number;
              ostring?: string;
              string: string;
            }
          >
        >(true);
      }
    });
  });

  it('guarantees the presence of required flags', () => {
    defineCommandHandler({
      description,
      flags: {
        boolean: C.flag('boolean', description),
        number: C.flag('number', description, { required: true }),
        string: C.flag('string', description, { required: true })
      },
      handler: async (flags) => {
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
    });
  });

  it('uses a narrow type for choice flags', () => {
    defineCommandHandler({
      description,
      flags: {
        number: C.flag('choice', description, { choices: [1, 2] }),
        string: C.flag('choice', description, { choices: ['alfa', 'bravo'] })
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              number?: 1 | 2;
              string?: 'alfa' | 'bravo';
            }
          >
        >(true);
      }
    });
  });

  it('supports lists of values', () => {
    defineCommandHandler({
      description,
      flags: {
        numbers: C.flag('number', description, { repeatable: true }),
        paths: C.flag('path', description, { repeatable: true }),
        specials: C.flag('choice', description, {
          choices: ['alfa', 'bravo'],
          default: ['bravo'],
          repeatable: true
        }),
        strings: C.flag('string', description, {
          repeatable: true,
          required: true
        })
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              numbers: number[];
              paths: string[];
              specials: Array<'alfa' | 'bravo'>;
              strings: string[];
            }
          >
        >(true);
      }
    });
  });
});
