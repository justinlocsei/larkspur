import { test } from '@fast-check/vitest';

import { buildHelp } from './help.ts';
import {
  fetchCommandGroup,
  fetchCommandHandler
} from './tests/properties/commands.ts';
import { entryPoint } from './tests/properties.ts';
import { createTestContext } from './tests.ts';

test.prop([entryPoint()])(
  'command trees always produce help messages',
  entry => {
    buildHelp({
      context: createTestContext(),
      scope: { commands: entry.tree, type: 'root' }
    });
  }
);

test.prop([entryPoint()])(
  'command handlers in a tree always produce help messages',
  entry => {
    for (const path of entry.handlers) {
      const command = fetchCommandHandler(entry, path);

      buildHelp({
        context: createTestContext(),
        scope: { command, path, type: 'command' }
      });
    }
  }
);

test.prop([entryPoint()])(
  'command groups in a tree always produce help messages',
  entry => {
    for (const path of entry.groups) {
      const group = fetchCommandGroup(entry, path);

      buildHelp({
        context: createTestContext(),
        scope: { group, path, type: 'group' }
      });
    }
  }
);
