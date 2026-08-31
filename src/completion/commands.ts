import type { CommandGroup } from '../commands/types.js';
import C from '../factory.js';
import { COMPLETION_SHELLS } from '../types.js';
import { buildShellCompletions } from './shells.js';

/**
 * Define a command group to manage completions
 */
export function defineCompletionCommands(): CommandGroup {
  return C.group('manage shell completions', {
    generate: C(
      'generate a completion script',
      {
        shell: C.flag('choice', 'a supported shell', {
          choices: COMPLETION_SHELLS,
          required: true
        })
      },
      async ({ shell }, { commands, context }) =>
        buildShellCompletions(shell, { commands, context })
    )
  });
}
