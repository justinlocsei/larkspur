<p align="center">
  <img src="./assets/logo.svg" width="600" alt="Larkspur">
</p>

<br>

<p align="center">
  Larkspur is a zero-dependency Node.js CLI library optimized for internal tools with multiple, nested commands.  It has strong opinions, requiring a description for every command and flag and only allowing long flag names, with no short aliases or positional arguments.  In return, you get a small API surface, detailed help messages, robust shell completions, and excellent type information for flag values when using Larkspur via TypeScript.
</p>

<br>

## Installation

```sh
git clone https://github.com/justinlocsei/larkspur.git
```

## Quick Start

Define the CLI in a `run-task` file:

```js
#!/usr/bin/env node

import C, { run } from 'larkspur';

await run({
  build: C(
    'Build the application image',
    {
      mode: C.flag('choice', 'The build mode', {
        choices: ['development', 'production'],
        required: true
      }),
      tag: C.flag('string', 'Tags for the image', { repeatable: true }),
      verbose: C.flag('boolean', 'Show verbose output')
    },
    async (flags) => {
      console.log(`Running ${flags.mode} build`);

      buildImage({
        mode: flags.mode,
        tags: flags.tag,
        verbose: flags.verbose
      });
    }
  ),

  test: C.group('Run application tests', {
    integration: C(
      'Run integration tests',
      {
        cores: C.flag('number', 'The number of cores to use', { default: 4 }),
        file: C.flag('path', 'A single file to run'),
        verbose: C.flag('boolean', 'Show test details', { default: true })
      },
      async ({ cores, file, verbose }) => runIntegrationTests({
        cores,
        file,
        verbose
      })
    ),

    unit: C({
      description: 'Run unit tests',
      flags: {
        file: C.flag('path', 'A test file to run', { repeatable: true }),
        reporter: C.flag('string', 'The reporter to use')
      },
      handler: async ({ file: files, reporter }) => {
        runUnitTests({
          onlyFiles: files.filter(f => f.includes('.test')),
          reporter
        });
      }
    })
  }),

  version: C('Show the current version', async () => '1.0.0')
});
```

Run the CLI:

```sh
# Show available commands
./run-task --help
./run-task test --help

# Show flags for a command
./run-task build --help

# Build an image
./run-task build --mode development
./run-task build --mode=production --tag=alfa --tag=bravo --verbose

# Run tests
./run-task test integration
./run-task test integration --cores 8 --file test/integration/core.test.js --no-verbose
./run-task test unit --reporter=dot test/unit/parsing.test.ts test/unit/validation.test.ts
```

## TypeScript

Larkspur is written in TypeScript and is at its best when consumed in a `.ts` file, which gives you access to constraints around command and flag definitions and narrowly typed flag values in handlers.  As long as you're using a recent version of Node.js 22 or later, a standard `node` shebang in your CLI will allow it to execute directly, giving you rich types from Larkspur without the need for a build process.

## Usage

Larkspur has a focused public API that makes defining simple tools easy and complex ones possible.  The following sections provide details about how to build a CLI using Larkspur.  All examples assume that the CLI code resides in a file named `my-cli` that has been marked as executable and starts with a shebang of `#!/usr/bin/env node`.  The shebang will be omitted from most example code for clarity, but must be present in any CLI tools that you write with Larkspur.

### Defining a CLI

All Larkspur CLIs are exposed using the `run` function, which takes a tree of named command definitions.  A minimal CLI looks like the following:

```js
#!/usr/bin/env node

import C, { run } from 'larkspur';

await run({
  'root-command': C('The root command', async () => {})
});
```

If you store this code in a file named `my-cli`, you could invoke its one and only command by running `my-cli root-command`.  Keys in command definitions map exactly to command names, and support a limited set of characters that is enforced at runtime.

### CLI Structure

The tree of commands passed to `run` can define either command groups or command handlers.

A command group contains one or more child commands, and groups can recursively contain other groups.  Each group acts as a namespace for its commands, so a group named `test` with a child command named `unit` would be invoked by running `my-cli test unit`.

A command handler is a concrete function that runs an action and has access to any flags that a user provided.  Handler functions are covered in detail later on, but the most basic handler is an empty async function, which will allow the command to run and exit with a 0 status code.

#### File Properties

A Larkspur CLI is intended to be directly executed, either via `./my-cli` for a local file or `my-cli`, if the command lives on a user's `PATH`.  For this to work, you must ensure that the file is marked as executable via command like `chmod +x my-cli` and that it starts with a shebang that invokes the Node.js interpreter, such as `#!/usr/bin/env node`.

Files without an extension can be troublesome to integrate with tooling, so one option is to define your CLI in a file with an extension that is covered by your build tooling and create a symlink to it without an extension.  Larkspur's own task runner does this, with a `bin/larkspur` file that is a symlink to `tasks/index.ts`.

#### Modular Definitions

To avoid a single CLI definition with thousands of lines, you can split command definitions into separate files that get loaded by the entry point.  As long as you define command handlers or groups defined via the `C` factory, you can pass them around to build up the larger command tree.

```js
// build.mjs
import C from 'larkspur';

export default C('Build the application', async () => {});
```

```js
// test.mjs
import C from 'larkspur';
import unit from './unit.mjs';

export default C.group('Run tests', { unit });
```

```js
// test/unit.mjs
import C from 'larkspur';

export default C('Run unit tests', async () => {});
```

```js
// index.mjs
import { run } from 'larkspur';

import build from './build.mjs';
import test from './test.mjs';

await run({ build, test });
```

### CLI Features

Any CLI built with Larkspur exposes a core set of functionality to a user without any further configuration.  If desired, some of the features described below can be disabled or customized, as described in the section on configuring Larkspur.

#### Help Messages

Larkspur can show help messages for the CLI and each of its commands via a `--help` flag.  Passing this to the CLI's root command or a named command group will show all commands available at that level, and using `--help` with a command handler will show all available flags.

#### Command Discovery

All commands and flags can be recursively listed at any level of a command tree using the `--explore` flag.  This can be used by both humans and agents, as the output closely matches that of the standard help messages.

#### Shell Completions

Any Larkspur CLI can generate completions for bash and zsh using the top-level `completions` command group, which is present by default.  A user of your CLI would install completions by running `my-cli completions install --shell=<bash|zsh>`.  This command shows shell-specific installation instructions that a user can follow to set up completions for your CLI.

For completions to work, your CLI must be on the user's `PATH`.  The installation instructions mention this requirement but do not explain how to configure `PATH`; if your users may need guidance, provide it in your CLI's documentation.

Installed completions are refreshed every time a user starts a new terminal session.  While this may result in a slight performance hit for very large CLIs, it allows your users to receive updated completions as you release changes to your CLI by opening a new terminal session.

If you wish to manage completions for internal users, you can run `my-cli completions generate --shell=<bash|zsh>` to print the completions for the requested shell.  If you save these to a file and configure a user's shell to read that file, you can avoid the cost of refreshing completions for each interactive terminal session.

### Configuring Larkspur

While Larkspur has strong opinions, it allows for some configuration via the options object that can be passed to `run`.

```js
import C, { run } from 'larkspur';

await run(
  { version: C('Show the current version', async () => '1.0.0') },
  {
    completions: { enabled: false },
    help: {
      explore: { flag: 'document' },
      indent: 2
    },
    name: 'custom-name'
  }
)
```

The available configuration options are as follows:

* `completions.enabled`: Whether completion commands are available (default: `true`)
* `completions.group`: The name of the group that exposes completion commands (default: `'completions'`)
* `description`: A program description shown in help messages
* `help.explore.enabled`: Whether the explore flag is available (default: `true`)
* `help.explore.flag`: The name of the explore flag (default: `'explore'`)
* `help.indent`: The number of spaces used for indentation in help message (default: `2`)
* `name`: A custom program name shown in help messages, which can be used if the inferred name of the CLI is incorrect

All of the properties above are optional.  If partial configuration data is provided, such as a `completions` object with a `group` but no `enabled` value, user-provided values will be merged on top of the default values.

### Defining Commands

CLI commands are defined using the factory that is Larkspur's default export, which is commonly aliased to `C`, for "command".  This factory allows you to define both command handlers and group.

#### Command Handlers

A command handler is defined by calling the `C` function.  This has multiple signatures that allow you to provide progressively more detail for the defined commands:

```js
import C from 'larkspur';

// C(<description>, <handler>)
C(
  'A basic command',
  async () => 'Handler logic'
);

// C(<description>, <flags>, <handler>)
C(
  'A command with flags',
  { message: C.flag('string', 'A message to show') },
  async (flags) => `Message: ${flags.message}`
);

// C(<fields>)
C({
  description: 'A command with extended options',
  flags: { version: C.flag('number', 'A version number') },
  handler: async (flags) => `Version: ${flags.version.toString()}`
});
```

The first two forms are the most concise and commonly used.  The third form allows you to set all object properties directly, which can be useful if you are building dynamic commands.

#### Command Groups

Command handlers can be assembled in a group, allowing for calls like `my-cli test unit` and `my-cli test integration`.  Groups may also contain other groups, allowing for deeply nested CLIs.

```js
import C from 'larkspur';

// C.group(<description>, <commands>)
C.group('Outer group', {
  command: C('Command handler', async () => {}),
  inner: C.group('Inner group', {
    child: C('Child command', async () => {})
  })
});
```

#### Handler Logic

When a command handler is invoked via a CLI call, its handler function is called.  This is an async function that receives parsed flag values as its first parameter and parsing details as its second.  Handlers have very few constraints, and can freely call any synchronous or asynchronous code.

#### Command Flags

The first parameter a handler function receives is an object that maps flag names to parsed values.  If you are consuming Larkspur via TypeScript, flag values will be narrowly typed based on the flag definitions you provided.

```js
import C from 'larkspur';

C(
  'Show a message',
  {
    chars: C.flag('number', 'The number of characters to show'),
    'message-text': C.flag('string', 'The message', { required: true }),
    suffix: C.flag('string', 'Text to show after the message', { repeatable: true }),
  },
  async (flags) => {
    const message = `${flags['message-text']}${flags.suffix.join('')}`;
    const { chars = message.length } = flags;

    console.log(message.slice(0, chars));
  }
);
```

The supported flags and their options are covered in detail further on in this document.

#### Parsing Details

A handler has access to details about how the command was parsed before execution.  Parsing details contain the following fields:

* `commands`: The complete command tree
* `context.config`: Resolved values for all configurable properties
* `context.metadata`: The name and description of the current CLI
* `providedFlags`: A set containing the names of all flags that were provided by the user

These details can be used to customize the behavior of the command, as demonstrated below:

```js
import C from 'larkspur';

C({
  description: 'Run tests',
  flags: { cores: C.flag('number', 'The number of cores to use', { default: 4 }) },
  handler: async ({ cores }, details) => {
    runTests({
      cores: details.providedFlags.has('cores') ? cores : cores * 2,
      label: details.context.metadata.name
    });
  }
});
```

In the above example, an explicit `--cores <number>` flag results in the requested number being used as-is, rather than doubled.  Additionally, tests will run with a label that matches the name of the CLI, such as `my-cli`.

#### Command Output

Command handlers can freely use the `console` methods to show output, as Larkspur performs no output of its own once a command handler has been resolved.  However, as a convenience, a command's function may return a string, which will be shown via `console.log`.

```js
import C, { run } from 'larkspur';

await run({
  console: C('Show output via console', async () => { console.log('output'); }),
  return: C('Show output via a return value', async () => 'output')
});
```

#### Error Handling

Any errors thrown by a command handler will show a full stacktrace by default.  If you wish to abort execution and show an error message to the user, you can use the `OperationalError` class that is part of Larkspur's public API.  This requires a message and accepts an optional second parameter that will be shown as error details below the message.

```js
import C, { OperationalError } from 'larkspur';

C(
  'Find a database record by ID',
  {
    id: C.flag('number', 'A record ID', { required: true }),
    verbose: C.flag('boolean', 'Show details if a query fails')
  },
  async ({ id, verbose }) => {
    const record = await findRecord(id);

    if (!record) {
      if (verbose) {
        throw new OperationalError(
          'No record found',
          `Requested record with ID: ${id}`
        );
      } else {
        throw new OperationalError('No record found');
      }
    }
  }
);
```

### Defining Flags

Larkspur has a rich system for defining flags and exposing their values to command handlers.  All flags are defined via the `C.flag` factory function, which requires a flag type and description, followed by flag-specific options.

Flags can be either boolean or scalar flags, the latter of which require a value.  Boolean flags are guaranteed to be either `true` or `false`, but scalar flags default to `undefined`.  A scalar flag can specify a default value via the `default` value, and can be marked as required using `required: true`.  If a required flag is not provided, the CLI will exit early with a validation error.

All flag examples below involve a single command with multiple flags that show the range of options available.  It will be invoked as `my-cli test` in the examples.

#### Boolean Flags

Boolean flags default to `false`, but can be set to default to `true` instead.  In the latter case, the flag is exposed in the CLI as `--no-<name>`, allowing a user to opt out of the flag.

```js
import C from 'larkspur';

C(
  'Demonstrate boolean flags',
  {
    profile: C.flag('boolean', 'Enable profiling', { default: true }),
    verbose: C.flag('boolean', 'Show verbose output')
  },
  async (flags) => `profile=${flags.profile}:verbose=${flags.verbose}`
);
```

```sh
my-cli test
# => profile=true:verbose=false

my-cli test --no-profile --verbose
# => profile=false:verbose=true
```

#### String Flags

String flags provide values directly as they were given by the user, with no normalization or transformation.

```js
import C from 'larkspur';

C(
  'Demonstrate string flags',
  {
    always: C.flag('string', 'A string with a default value', { default: 'alfa' }),
    optional: C.flag('string', 'An optional value'),
    required: C.flag('string', 'A required value', { required: true })
  },
  async (flags) => `always=${flags.always}:optional=${flags.optional}:required=${flags.required}`
);
```

```sh
my-cli test --required bravo
# => always=alfa:optional=undefined:required=bravo

my-cli test --always alfa --optional bravo --required charlie
# => always=alfa:optional=bravo:required=charlie
```

#### Path Flags

Path flags are specialized string flags that normalize user-provided paths as absolute paths.  When shell completions are enabled, they provide filesystem paths as suggestions.

```js
import C from 'larkspur';
import path from 'node:path';

C(
  'Demonstrate path flags',
  { file: C.flag('path', 'A file path'), },
  async ({ file }) => `${path.basename(file)}:${path.isAbsolute(file)}`
);
```

```sh
my-cli test --file relative/path.ts
# => path.ts:true

my-cli test --file /tmp/path.ts
# => path.ts:true
```

#### Number Flags

Number flags treat the strings provided via the command line as numeric values.

```js
import C from 'larkspur';

C(
  'Demonstrate number flags',
  {
    always: C.flag('number', 'A number with a default value', { default: 1 }),
    optional: C.flag('number', 'An optional value'),
    required: C.flag('number', 'A required value', { required: true })
  },
  async (flags) => `always=${flags.always}:optional=${flags.optional}:required=${Math.round(flags.required)}`
);
```

```sh
my-cli test --required 2
# => always=1:optional=undefined:required=2

my-cli test --always 1 --optional 0 --required 2.75
# => always=1:optional=0:required=3
```

#### Choice Flags

A choice flag requires a value to be in a list of known strings or numbers.  Providing a value outside of this list results in a validation error.

```js
import C from 'larkspur';

C(
  'Demonstrate choice flags',
  {
    number: C.flag('choice', 'A number', {
      choices: [1, 2, 3],
      default: 1
    }),
    string: C.flag('choice', 'A string', {
      choices: ['alfa', 'bravo']
    })
  },
  async (flags) => `number=${flags.number}:string=${flags.string}`
);
```

```sh
my-cli test
# => number=1:string=undefined

my-cli test --number 2 --string bravo
# => number=2:string=bravo
```

#### Repeatable Flags

All non-boolean flags can be marked as repeatable, which allows a user to assign multiple values to the flag and exposes the parsed value as an array.

```js
import C from 'larkspur';

C(
  'Demonstrate repeatable flags',
  {
    choices: C.flag('choice', 'Multiple choices', {
      choices: ['alfa', 'bravo'],
      repeatable: true
    }),
    numbers: C.flag('number', 'Multiple numbers', { repeatable: true }),
    paths: C.flag('path', 'Multiple paths', { repeatable: true }),
    strings: C.flag('string', 'Multiple strings', { repeatable: true })
  },
  async (flags) => Object.entries(flags).map(([k, v]) => `${k}=${v.length}`).join(':')
);
```

```sh
my-cli test
# => choices=0:numbers=0:paths=0:strings=0

my-cli test --choices alfa --numbers 1 --numbers 2 --paths bravo.txt --strings charlie --strings delta
# => choices=1:numbers=2:paths=1:strings=2
```

#### Flag Validation

Non-choice scalar flags can define validators that act on the parsed value of the flag.  A validator should return `true` when the value is valid.  Returning `false` will cause a generic validation error to be shown.  To show a custom error message, a validator function can return a string, which will be shown directly to the user.

```js
import C from 'larkspur';

C(
  'Demonstrate flag validation',
  {
    number: C.flag('number', 'An even number', {
      isValid: v => v % 2 === 0 || 'Number must be even'
    }),
    string: C.flag('string', 'A string that starts with "a"', {
      isValid: v => v.startsWith('a')
    })
  },
  async (flags) => `number=${flags.number}:string=${flags.string}`
);
```

```sh
my-cli test
# => number=undefined:string=undefined

my-cli test --number 1 --string a
# => Error: Number must be even

my-cli test --number 2 --string b
# => Error: Unsupported value: b

my-cli test --number 2 --string a
# => number=2:string=a
```

#### Custom Completions

Non-choice scalar flags can define custom lists of suggestions to support the default shell completions.  Suggestions are provided by async JS functions that return lists of strings that will be shown to a user hitting tab after entering the name of the flag that provides custom completions.  A completion function has access to the current flag value typed by the user via an object parameter with a `current` property.

```js
import C from 'larkspur';

const values = ['alfa', 'bravo'];

C(
  'Demonstrate custom completions',
  {
    value: C.flag('string', 'A value', {
      completions: async ({ current }) => current ? values.map(v => `${current}-${v}`) : values
    })
  },
  async () => {}
);
```

```sh
my-cli test --value <TAB>
# => alfa bravo

my-cli test --value test<TAB>
# => test-alfa test-bravo
```
