import { fc } from '@fast-check/vitest';

import type { Command, CommandTree } from '../../commands/types.js';
import C from '../../factory.js';
import { flags } from './flags.js';
import { identifier } from './identifiers.js';

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

const command = fc.tuple(identifier, flags).map(([name, flags]): Command =>
  C(name, flags, async () => {})
);

const commandGroup = fc.uniqueArray(fc.tuple(identifier, command), {
  minLength: 1
})
  .map(commands =>
    commands.reduce<CommandTree>((p, [name, command]) => {
      p[name] = command;
      return p;
    }, {})
  );
