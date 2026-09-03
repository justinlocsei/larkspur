import type { CommandGroup, EntryPoint } from '../commands/types.js';
import { OperationalError } from '../errors.js';
import C from '../factory.js';
import type { Context } from '../types.js';
import { buildInstallInstructions, buildShellCompletions } from './build.js';
import { provideCompletions } from './custom.js';
import { detectShell, SUPPORTED_SHELLS } from './shells.js';

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
          choices: SUPPORTED_SHELLS
        })
      },
      async (flags, { commands, context }) => {
        const shell = flags.shell || detectShell(process.env);

        if (!shell) {
          throw new OperationalError(
            'Completions are not supported for the current shell.'
          );
        }

        return buildInstallInstructions(shell, { commands, context });
      }
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
      handler: async ({ current, flag, shell }, { commands, context }) =>
        provideCompletions(
          { commands, context },
          { current, flag, shell }
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
