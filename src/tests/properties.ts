import { fc } from '@fast-check/vitest';

import type { Command, CommandTree } from '../commands/types.js';
import C from '../factory.js';
import type {
  BooleanFlag,
  ChoiceFlag,
  NumberFlag,
  PathFlag,
  StringFlag
} from '../flags/types.js';

export const argv = fc.array(
  fc.string({ maxLength: 40 }),
  { maxLength: 20 }
);

type SingleCommand = {
  name: string;
  tree: CommandTree;
};

export const singleCommand = identifier.map(
  (name): SingleCommand => ({
    name,
    tree: { [name]: C('description', async () => {}) }
  })
);
