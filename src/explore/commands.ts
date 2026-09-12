import type { EntryPoint } from '../commands/types.ts';
import { OperationalError } from '../errors.ts';
import { buildExploreMessage } from '../explore.ts';
import C from '../factory.ts';
import type { Context } from '../types.ts';

/**
 * Define the explore command
 */
export function defineExploreCommand() {
  return C(
    'Explore the CLI',
    (_, { commands, context }) => buildExploreMessage({ commands, context })
  );
}

/**
 * Add the explore command to a CLI entry point
 */
export function withExploreCommand(
  entry: EntryPoint,
  { config: { explore } }: Context
): EntryPoint {
  if (!explore.enabled) {
    return entry;
  } else if (explore.command in entry) {
    throw new OperationalError(
      `Explore would conflict with an existing command: ${explore.command}`
    );
  }

  return {
    ...entry,
    [explore.command]: defineExploreCommand()
  };
}
