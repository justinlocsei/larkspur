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
import { IDENTIFIER_PATTERN, NEGATE_BOOLEAN } from '../validation.js';

export const argv = fc.array(
  fc.string({ maxLength: 40 }),
  { maxLength: 20 }
);

export const identifier = fc.stringMatching(IDENTIFIER_PATTERN);

export const flagName = identifier.filter(name =>
  !name.startsWith(NEGATE_BOOLEAN)
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
