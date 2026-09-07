import type { CommandGroup, EntryPoint } from '../commands/types.ts';
import { OperationalError } from '../errors.ts';
import C from '../factory.ts';
import type { Context } from '../types.ts';
import {
  buildInstallationInstructions,
  buildShellCompletions
} from './build.ts';
import { provideCompletions } from './custom.ts';
import { SUPPORTED_SHELLS } from './shells.ts';

/**
 * Define a command group to manage completions
 */
export function defineCompletionCommands(): CommandGroup {
  return C.group('manage shell completions', {
    generate: C(
      'generate a completion script',
      {
        shell: C.flag('choice', 'a supported shell', {
          choices: SUPPORTED_SHELLS,
          required: true
        })
      },
      async ({ shell }, { commands, context }) =>
        buildShellCompletions(shell, { commands, context })
    ),

    install: C(
      'show installation instructions',
      {
        shell: C.flag('choice', 'a supported shell', {
          choices: SUPPORTED_SHELLS,
          required: true
        })
      },
      async ({ shell }, { commands, context }) =>
        buildInstallationInstructions(shell, { commands, context })
    ),

    provide: C({
      description: 'provide values for a custom flag completion',
      flags: {
        current: C.flag('string', 'the current value'),
        flag: C.flag('string', 'the encoded flag path', { required: true }),
        shell: C.flag('choice', 'a supported shell', {
          choices: SUPPORTED_SHELLS,
          required: true
        })
      },
      handler: async ({ current, flag }, { commands, context }) =>
        await provideCompletions(
          { commands, context },
          { current, flag }
        ),
      hidden: true
    })
  });
}

/**
 * Add completion commands to a CLI entry point
 */
export function withCompletionCommands(
  entry: EntryPoint,
  { config: { completion } }: Context
): EntryPoint {
  const { group } = completion;

  if (!completion.enabled) {
    return entry;
  } else if (group in entry) {
    throw new OperationalError(
      `Completions would conflict with an existing command: ${group}`
    );
  }

  return {
    ...entry,
    [group]: defineCompletionCommands()
  };
}
