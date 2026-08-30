import { assert, describe, it } from 'vitest';

import { T } from '../tests.js';
import { defineCommandGroup, defineCommandHandler } from './definition.js';

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
        boolean: {
          description,
          type: 'boolean'
        },
        number: {
          description,
          type: 'number'
        },
        path: {
          description,
          type: 'path'
        },
        string: {
          description,
          type: 'string'
        }
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
        boolean: {
          default: true,
          description,
          type: 'boolean'
        },
        number: {
          default: 1,
          description,
          type: 'number'
        },
        onumber: {
          default: undefined,
          description,
          type: 'number'
        },
        ostring: {
          default: undefined,
          description,
          type: 'string'
        },
        string: {
          default: 'Value',
          description,
          type: 'string'
        }
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
        boolean: {
          description,
          type: 'boolean'
        },
        number: {
          description,
          required: true,
          type: 'number'
        },
        string: {
          description,
          required: true,
          type: 'string'
        }
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

  it('supports specialized string flags using default values', () => {
    type Alfa = 'alfa' | 'ALFA';
    type Bravo = 'bravo' | 'BRAVO';

    const asType = <T>(value: T): T => value;

    const alfa = asType<Alfa>('alfa');
    const bravo = asType<Bravo>('BRAVO');

    defineCommandHandler({
      description,
      flags: {
        alfa: {
          default: alfa,
          description,
          type: 'string'
        },
        bravo: {
          default: bravo,
          description,
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              alfa: string;
              bravo: string;
            }
          >
        >(true);
      }
    });
  });

  it('supports specialized string values using choice lists', () => {
    type Alfa = 'alfa' | 'ALFA';
    type Bravo = 'bravo' | 'BRAVO';

    const asList = <T>(value: T[]): T[] => value;

    const alfa = asList<Alfa>(['alfa']);
    const bravo = asList<Bravo>(['BRAVO']);

    const bravoDefault: Bravo = 'bravo';

    defineCommandHandler({
      description,
      flags: {
        alfa: {
          choices: alfa,
          description,
          type: 'choice'
        },
        bravo: {
          choices: bravo,
          default: bravoDefault,
          description,
          type: 'choice'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              alfa?: Alfa;
              bravo: Bravo;
            }
          >
        >(true);
      }
    });
  });

  it('supports specialized strings using validator functions', () => {
    type Alfa = 'alfa' | 'ALFA';
    type Bravo = 'bravo' | 'BRAVO';

    const asList = <T>(value: T[]): T[] => value;

    const alfa = asList<Alfa>(['alfa', 'ALFA']);
    const bravo = asList<Bravo>(['bravo', 'BRAVO']);

    defineCommandHandler({
      description,
      flags: {
        alfa: {
          choices: alfa,
          description,
          type: 'choice'
        },
        bravo: {
          choices: bravo,
          description,
          type: 'choice'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              alfa?: Alfa;
              bravo?: Bravo;
            }
          >
        >(true);
      }
    });
  });

  it('supports lists of values', () => {
    type Special = 'alfa' | 'bravo';

    const asType = <T>(value: T): T => value;
    const special = asType<Special>('alfa');

    defineCommandHandler({
      description,
      flags: {
        numbers: {
          allowMany: true,
          description,
          type: 'number'
        },
        paths: {
          allowMany: true,
          description,
          type: 'path'
        },
        specials: {
          allowMany: true,
          choices: ['alfa', 'bravo'] as const,
          default: special,
          description,
          type: 'choice'
        },
        strings: {
          allowMany: true,
          description,
          required: true,
          type: 'string'
        }
      },
      handler: async (flags) => {
        T.assert<
          T.Equivalent<
            typeof flags,
            {
              numbers?: number[];
              paths?: string[];
              specials: Special[];
              strings: string[];
            }
          >
        >(true);
      }
    });
  });
});
