<p align="center">
  <img src="./assets/logo.svg" width="600" alt="Larkspur">
</p>

<br>

<p align="center">
  Larkspur is a zero-dependency, TypeScript-first CLI library for internal tools with nested commands.  It has strong opinions.  Every command and flag requires a description, only long flag names are allowed, and positional arguments are unsupported.  In return, you get self-describing CLIs that are easy for developers to learn and agents to understand.  You also get a small API surface with excellent type information, rich shell completions, detailed help messages, and an <code>explore</code> command that recursively shows all available commands and flags in the CLI.
</p>

<p align="center">
  <a href="https://github.com/justinlocsei/larkspur/actions/workflows/verify.yml"><img src="https://github.com/justinlocsei/larkspur/actions/workflows/verify.yml/badge.svg" alt="Verify"></a>
  <a href="https://www.npmjs.com/package/larkspur"><img src="https://img.shields.io/npm/v/larkspur.svg" alt="npm version"></a>
  <a href="https://github.com/justinlocsei/larkspur/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/larkspur.svg" alt="License"></a>
</p>

---

<!-- <toc> -->
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Distribution](#distribution)
  - [Extended Entry Points](#extended-entry-points)
- [Documentation Conventions](#documentation-conventions)
- [Defining a CLI](#defining-a-cli)
  - [CLI Structure](#cli-structure)
  - [Modular Definitions](#modular-definitions)
- [CLI Features](#cli-features)
  - [Help Messages](#help-messages)
  - [Version Reporting](#version-reporting)
    - [Dynamic Versions](#dynamic-versions)
  - [Command Discovery](#command-discovery)
  - [Shell Completions](#shell-completions)
- [Configuring Larkspur](#configuring-larkspur)
- [Defining Commands](#defining-commands)
  - [Command Handlers](#command-handlers)
  - [Command Groups](#command-groups)
  - [Handler Logic](#handler-logic)
  - [Command Flags](#command-flags)
  - [Parsing Details](#parsing-details)
  - [Command Output](#command-output)
  - [Error Handling](#error-handling)
- [Defining Flags](#defining-flags)
  - [Boolean Flags](#boolean-flags)
  - [String Flags](#string-flags)
  - [Path Flags](#path-flags)
  - [Number Flags](#number-flags)
  - [Choice Flags](#choice-flags)
  - [Repeatable Flags](#repeatable-flags)
  - [Flag Validation](#flag-validation)
  - [Custom Completions](#custom-completions)
- [Middleware](#middleware)
  - [Defining Middleware](#defining-middleware)
  - [Applying Middleware](#applying-middleware)
- [TypeScript](#typescript)
  - [Public Types](#public-types)
  - [Typed Helpers](#typed-helpers)
  - [Dynamic CLIs](#dynamic-clis)
- [Why the Name?](#why-the-name)
<!-- </toc> -->

## Installation

```sh
npm install larkspur
```

## Quick Start

> [!NOTE]
> While this example uses `.mjs` for simplicity, Larkspur really shines when used in a `.ts` file.  TypeScript gives you narrowly typed flag values in command handlers, with required flags, choice unions, repeatable values, and defaults all reflected in the types.  You also get compile-time validation when building command trees and power tools like `ValuesOf<Flags>`.  See [TypeScript](#typescript) for details.

Define the CLI as an ESM module in a file named `my-cli.mjs`:

```js
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
      console.log(`Running build: ${flags.mode}`);

      await buildImage({
        commit: await getLatestCommitSHA(),
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
      ({ cores, file, verbose }) => runIntegrationTests({
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
      handler: ({ file: files, reporter }) => runUnitTests({
        onlyFiles: files.filter(f => f.includes('.test')),
        reporter
      })
    })
  })
});
```

Run the CLI:

```sh
# Show root commands
node my-cli.mjs --help

# Show nested commands
node my-cli.mjs test --help

# Show flags for a command
node my-cli.mjs build --help

# Recursively show all commands in the CLI
node my-cli.mjs explore

# Build an image
node my-cli.mjs build --mode development
node my-cli.mjs build --mode=production --tag=alfa --tag=bravo --verbose

# Run tests
node my-cli.mjs test integration
node my-cli.mjs test integration --cores 8 --file test/integration/core.test.js --no-verbose
node my-cli.mjs test unit --reporter=dot --file test/unit/parsing.test.ts --file test/unit/validation.test.ts
```

Larkspur CLIs only support long flag names like `--reporter`, rather than short flags like `-r`.  Values can be passed to flags using either `--reporter dot` or `--reporter=dot` syntax, and the two can be used interchangeably in the same command invocation.  While restrictive, the use of long flag names is a design choice that optimizes for discoverability and readability.

## Distribution

Larkspur runs on Node 22 or later, in a Linux, Mac, or Windows environment.  It is optimized for internal CLIs, and the ideal distribution route is via a repository with a `package.json` that includes `larkspur` as a dependency.

In that repo, your CLI's entry point will be a `.ts` or `.mjs` file that calls the `run` function exported from `larkspur`.  This entry point should be added to your package's `bin` field:

```json
{
  "bin": {
    "my-cli": "./src/my-cli.ts"
  }
}
```

This will allow your users to check out your repo and run `npm install`, which will create a `my-cli` executable in `node_modules/.bin`.  Your users can then invoke the CLI by running `npx my-cli` or adding your project's `node_modules/.bin` directory to their `PATH` and running `my-cli` directly.

As long as you are using Node 22.18 or above, you should be able to directly execute most `.ts` files without a build step. If your particular CLI needs to support older Node 22 versions or involves syntax that cannot be directly executed, you can run your CLI using [tsx](https://www.npmjs.com/package/tsx) or similar tools.

### Extended Entry Points

Larkspur does not constrain you to a single CLI.  You can define multiple entry points as `.ts` or `.mjs` files, each of which must call `run`, and expose them as separate executables via your `package.json`:

```json
{
  "bin": {
    "my-app-cli": "./src/apps/cli.mjs",
    "my-core-cli": "./src/cli.ts"
  }
}
```

An `npm install` of this package would add a `my-app-cli` and a `my-core-cli` executable.

## Documentation Conventions

The rest of this document provides code samples that illustrate how to use Larkspur to define your CLI.  All examples assume the use of a file named `my-cli.mjs` that is exposed as an executable named `my-cli`.

## Defining a CLI

All Larkspur CLIs are defined using the `run` function, which takes a tree of named command definitions.  A minimal CLI looks like the following:

```js
import C, { run } from 'larkspur';

await run({
  'root-command': C('The root command', () => {})
});
```

To invoke the one and only command in this CLI, you would run `my-cli root-command`.  Keys in command definitions map exactly to command names, and support a limited set of characters that is enforced at runtime.

### CLI Structure

The tree of commands passed to `run` can define either command groups or command handlers.

A command group contains one or more child commands, and groups can recursively contain other groups.  Each group acts as a namespace for its commands, so a group named `test` with a child command named `unit` would be invoked by running `my-cli test unit`.

A command handler is a concrete function that runs an action and has access to the values of all flags associated with the command.  Handler functions are covered in detail later on, but the most basic handler is an empty function, which will allow the command to run and exit with a 0 status code.

### Modular Definitions

To avoid a single CLI definition with thousands of lines, you can split command definitions into separate files that get loaded by the entry point.  As long as you define command handlers or groups using the `C` factory, you can pass them around to build up the larger command tree.

```js
// build.mjs
import C from 'larkspur';

export default C('Build the application', () => {});
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

export default C('Run unit tests', () => {});
```

```js
// index.mjs
import { run } from 'larkspur';

import build from './build.mjs';
import test from './test.mjs';

await run({ build, test });
```

## CLI Features

Any CLI built with Larkspur exposes a core set of functionality to a user without any further configuration.  If desired, some of the features covered below can be disabled or customized, as described in the section on configuring Larkspur.

### Help Messages

Larkspur can show help messages for a CLI and each of its commands via a `--help` flag.  Passing this flag to the CLI's root command or a named command group will show all commands available at that level, and using `--help` with a command handler will show all available flags.

### Version Reporting

Larkspur allows you to define a version for your CLI that will be shown to your users if they call `my-cli --version`.  To define a version, provide it as a field in the options object passed to `run`:

```js
import C, { run } from 'larkspur';

await run(
  { command: C('A command', () => {}) },
  { version: '1.0.0' }
);
```

This will enable the `--version` flag, which is only accepted by the CLI itself, rather than its commands:

```sh
my-cli --version
# => 1.0.0

my-cli command --version
# => Error: Unknown flag: --version
```

#### Dynamic Versions

If your CLI's version is stored outside of its definition file, you can use a sync or async function that returns a string for the `version` field.  These functions are given a context object that exposes the following helpers:

* `getEntryFile()`: Return the absolute path to the file Node executed to start your CLI
* `getPackageVersion()`: Return the `version` field from the nearest `package.json` file

Each of the following examples is a valid dynamic CLI version:

```ts
import fs from 'node:fs/promises';
import type { VersionProvider as V } from 'larkspur';

const isSync: V = () => '1.0.0';
const isAsync: V = async () => '1.0.0';

const fromFile: V = async ctx => {
  const stats = await fs.stat(ctx.getEntryFile());
  return `1.0.${stats.mtimeMs}`;
};

const fromPackage: V = ctx => ctx.getPackageVersion();
```

Most CLIs should be able to use `getPackageVersion` without issues.  The `getEntryFile` helper is intended as an escape hatch if you are distributing your CLI with an uncommon file structure.

### Command Discovery

All commands and flags can be recursively listed using the top-level `explore` command. The output is structured and readable by humans or agents, and can be used to quickly gain an understanding of the full set of features offered by the CLI.

By default, `explore` lists only your application's commands.  You can pass `--include-built-ins` to also show Larkspur's built-in commands, such as `explore` and `completions`.

The `explore` command supports multiple output formats via its `--format` flag:

* `full`: The default format, which shows all commands, descriptions, and flags
* `names`: A compact list of the command names
* `summary`: The `names` format with inline command descriptions

In practice, this looks like the following, which is truncated output from running `explore` on Larkspur's own internal task runner:

```
$ larkspur build

    Build Larkspur

$ larkspur check [flags]

    Check the codebase

    --only <choice> ...
      Only run the given checks
      (Choices: code, formatting, types)
      (Default: code, formatting, types)

$ larkspur format code

    Format the codebase

$ larkspur format docs

    Format documentation

…

$ larkspur test property [flags]

    Run property tests

    --name <string>
      Only run tests in files matching the given pattern
    --runs <number>
      The number of test runs
    --seed <number>
      A fixed seed

$ larkspur test unit [flags]

    Run unit tests

    --name <string>
      Only run tests in files matching the given pattern
```

### Shell Completions

Any Larkspur CLI can generate completions for bash and zsh using the top-level `completions` command group, which is present by default.  A user of your CLI would install completions by running `my-cli completions install --shell=<bash|zsh>`.  This command shows shell-specific installation instructions that a user can follow to set up completions for your CLI.

For completions to work, your CLI must be on the user's `PATH`.  The installation instructions mention this requirement but do not explain how to configure `PATH`; if your users may need guidance, you can provide it in your CLI's documentation.

Installed completions are refreshed every time a user starts a new terminal session.  While this may result in a slight startup delay for very large CLIs, it allows your users to automatically receive updated completions as you release changes to your CLI.

If you wish to manage completions for internal users, you can run `my-cli completions generate --shell=<bash|zsh>` to print the completions for the requested shell.  If you save this output to a file and configure a user's shell to read that file, you can avoid the startup cost of refreshing completions when opening a new terminal session.

## Configuring Larkspur

While Larkspur has strong opinions, it allows for some configuration via the options object that can be passed to `run`.

```js
import C, { run } from 'larkspur';

await run(
  { command: C('A command', () => {}) },
  {
    completions: { enabled: false },
    explore: { command: 'document' },
    help: { indent: 2 },
    name: 'custom-name',
    version: '1.0.0'
  }
)
```

The available configuration options are as follows:

* `completions.enabled`: Whether completion commands are available (default: `true`)
* `completions.group`: The name of the group that exposes completion commands (default: `'completions'`)
* `description`: A program description shown in help messages
* `explore.command`: The name of the explore command (default: `'explore'`)
* `explore.enabled`: Whether the explore command is available (default: `true`)
* `help.indent`: The number of spaces used for indentation in help message (default: `2`)
* `name`: A custom program name shown in help messages, which can be used if the inferred name of the CLI is incorrect
* `version`: A version string or a function that returns one

All of the properties above are optional.  If partial configuration data is provided, such as a `completions` object with a `group` but no `enabled` value, user-provided values will be merged on top of the default values.

## Defining Commands

CLI commands are defined using the factory that is Larkspur's default export, which is commonly aliased to `C`, for "command".  This factory allows you to define both command handlers and group.

### Command Handlers

A command handler is defined by calling the `C` function.  This has multiple signatures that allow you to provide progressively more detail for the defined commands:

```js
import C from 'larkspur';

// C(<description>, <handler>)
C(
  'A basic command',
  () => 'Handler logic'
);

// C(<description>, <flags>, <handler>)
C(
  'A command with flags',
  { message: C.flag('string', 'A message to show') },
  flags => `Message: ${flags.message}`
);

// C(<fields>)
C({
  description: 'A command with named properties',
  flags: { version: C.flag('number', 'A version number') },
  handler: flags => `Version: ${flags.version.toString()}`
});
```

The first two forms are the most concise and commonly used.  The third form allows you to set all object properties directly, which can be useful if you are building dynamic commands.

### Command Groups

Command handlers can be assembled in a group, allowing for calls like `my-cli test unit` and `my-cli test integration`.  Groups may also contain other groups, allowing for deeply nested CLIs.

```js
import C from 'larkspur';

// C.group(<description>, <commands>)
C.group('Outer group', {
  command: C('Command handler', () => {}),
  inner: C.group('Inner group', {
    child: C('Child command', () => {})
  })
});
```

### Handler Logic

When a command is invoked via a CLI call, its handler function is called.  This is a synchronous or asynchronous function that receives parsed flag values as its first parameter and parsing details as its second.  Handlers have very few constraints, and can freely call any synchronous or asynchronous code.

### Command Flags

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
  flags => {
    const message = `${flags['message-text']}${flags.suffix.join('')}`;
    const { chars = message.length } = flags;

    console.log(message.slice(0, chars));
  }
);
```

The supported flags and their options are covered in detail later in this document.

### Parsing Details

A handler has access to details about how the command was parsed before execution.  Parsing details contain the following fields:

* `commands`: The complete command tree
* `context.config`: Resolved values for all configurable properties
* `context.metadata`: The name and description of the current CLI
* `path`: The path to the command as a list of strings, such as `['test', 'unit']`
* `providedFlags`: A set containing the names of all flags that were provided by the user

These details can be used to customize the behavior of a command:

```js
import C from 'larkspur';

C({
  description: 'Run tests',
  flags: { cores: C.flag('number', 'The number of cores to use', { default: 4 }) },
  handler: ({ cores }, details) => {
    runTests({
      cores: details.providedFlags.has('cores') ? cores : cores * 2,
      label: details.context.metadata.name
    });
  }
});
```

In the above example, an explicit `--cores <number>` flag results in the requested number being used as is, rather than doubled.  Additionally, tests will run with a label that matches the name of the CLI, such as `my-cli`.

### Command Output

Command handlers can freely use the `console` methods to show output, as Larkspur performs no output of its own once a command handler has been resolved.  However, as a convenience, a command's function may return a string, which will be shown via `console.log`.

```js
import C, { run } from 'larkspur';

await run({
  console: C('Show output via console', () => { console.log('output'); }),
  return: C('Show output via a return value', () => 'output')
});
```

### Error Handling

Any errors thrown by a command handler will show a full stacktrace by default.  If you wish to abort execution and show an error message to the user without a stacktrace, you can use the `OperationalError` class that is part of Larkspur's public API.  This requires a message and accepts an optional second parameter that will be shown as error details below the message.

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

## Defining Flags

Larkspur has a rich system for defining flags and exposing their values to command handlers.  All flags are defined via the `C.flag` factory function, which requires a flag type and description, followed by flag-specific options.

Flags can be either boolean or scalar, the latter of which require a value.  Boolean flags are guaranteed to be either `true` or `false`, but scalar flags default to `undefined`.  A scalar flag can specify a default value via the `default` property and can be marked as required using `required: true`.  If a required flag is not provided, the CLI will exit early with a validation error.

All flag examples below involve a single command with multiple flags that show the range of options available.  It will be invoked as `my-cli test` in the examples.

### Boolean Flags

Boolean flags default to `false`, but can be set to default to `true` instead.  In the latter case, the flag is exposed in the CLI as `--no-<name>`, allowing a user to opt out of the flag.

```js
import C from 'larkspur';

C(
  'Demonstrate boolean flags',
  {
    profile: C.flag('boolean', 'Enable profiling', { default: true }),
    verbose: C.flag('boolean', 'Show verbose output')
  },
  flags => `profile=${flags.profile}:verbose=${flags.verbose}`
);
```

```sh
my-cli test
# => profile=true:verbose=false

my-cli test --no-profile --verbose
# => profile=false:verbose=true
```

### String Flags

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
  flags => `always=${flags.always}:optional=${flags.optional}:required=${flags.required}`
);
```

```sh
my-cli test --required bravo
# => always=alfa:optional=undefined:required=bravo

my-cli test --always alfa --optional bravo --required charlie
# => always=alfa:optional=bravo:required=charlie
```

### Path Flags

Path flags are specialized string flags that normalize both user-provided and default paths as absolute values.  When shell completions are enabled, they provide filesystem paths as suggestions.

If a path flag uses a default value, you'll want to decide how to handle portability.  In general, if you are supporting multiple platforms, it's better to determine a default path in a handler function based on the current platform.  If you are only supporting a single environment, though, using default values of well-known paths like `/tmp` or `C:\Windows` is fully supported.

```js
import C from 'larkspur';
import path from 'node:path';

C(
  'Demonstrate path flags',
  { file: C.flag('path', 'A file path'), },
  ({ file }) => `${path.basename(file)}:${path.isAbsolute(file)}`
);
```

On Mac and Linux:

```sh
my-cli test --file ./relative/path.ts
# => path.ts:true

my-cli test --file /tmp/file.ts
# => file.ts:true
```

On Windows:

```powershell
my-cli test --file .\relative\path.ts
# => path.ts:true

my-cli test --file C:\temp\file.ts
# => file.ts:true
```

### Number Flags

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
  flags => `always=${flags.always}:optional=${flags.optional}:required=${Math.round(flags.required)}`
);
```

```sh
my-cli test --required 2
# => always=1:optional=undefined:required=2

my-cli test --always 1 --optional 0 --required 2.75
# => always=1:optional=0:required=3
```

### Choice Flags

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
  flags => `number=${flags.number}:string=${flags.string}`
);
```

```sh
my-cli test
# => number=1:string=undefined

my-cli test --number 2 --string bravo
# => number=2:string=bravo
```

### Repeatable Flags

All non-boolean flags can be marked as repeatable, which allows a user to assign multiple values to the flag and exposes the parsed value as an array.  If a repeatable flag is not provided, it will have a value of `[]`, rather than `undefined`.

```js
import C from 'larkspur';

C(
  'Demonstrate repeatable flags',
  {
    choices: C.flag('choice', 'Multiple choices', {
      choices: ['alfa', 'bravo'],
      repeatable: true
    }),
    numbers: C.flag('number', 'Multiple numbers', {
      default: [1, 2],
      repeatable: true
    }),
    paths: C.flag('path', 'Multiple paths', { repeatable: true }),
    strings: C.flag('string', 'Multiple strings', { repeatable: true })
  },
  flags => Object.entries(flags).map(([k, v]) => `${k}=${v.length}`).join(':')
);
```

```sh
my-cli test
# => choices=0:numbers=2:paths=0:strings=0

my-cli test --choices alfa --numbers 1 --numbers 2 --paths bravo.txt --strings charlie --strings delta
# => choices=1:numbers=2:paths=1:strings=2
```

### Flag Validation

String, number, and path flags can define validators that act on the parsed value of the flag.  A validator should return `true` when the value is valid.  Returning `false` will cause a generic validation error to be shown.  To show a custom error message, a validator function can return a string, which will be shown directly to the user.

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
  flags => `number=${flags.number}:string=${flags.string}`
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

### Custom Completions

String, number, and path flags can define custom lists of suggestions to support the default shell completions.  Suggestions are provided by synchronous or asynchronous JS functions that return lists of strings that will be shown to a user hitting tab after entering the name of the flag that provides custom completions.  A completion function has access to the current flag value typed by the user via an object parameter with a `current` property.

```js
import C from 'larkspur';

const values = ['alfa', 'bravo'];

C(
  'Demonstrate custom completions',
  {
    server: C.flag('string', 'A server name', {
      completion: async ({ current: prefix }) => {
        const servers = await listServers();

        return prefix ? servers.filter(s => s.startsWith(prefix)) : servers;
      }
    }),
    value: C.flag('string', 'A value', {
      completion: ({ current }) => current ? values.map(v => `${current}-${v}`) : values
    })
  },
  () => {}
);
```

```sh
my-cli test --server <TAB>
# => dev-01 prod-01 prod-02

my-cli test --server de<TAB>
# => dev-01

my-cli test --value <TAB>
# => alfa bravo

my-cli test --value test<TAB>
# => test-alfa test-bravo
```

While this is an advanced feature, it provides excellent completions in cases where building the list of suggestions requires complex logic.  For example, [Larkspur's own test commands](https://github.com/justinlocsei/larkspur/blob/main/tasks/test.ts) use custom completions for a `--file` flag that search the source tree for test files and provide them as relative paths without extensions, matching the expectations of Vitest.

## Middleware

Larkspur supports middleware commands that can extend existing commands in your CLI with additional flags and custom logic executed before and after your command's core logic.  To keep this concrete, let's start with an example:

```js
import C, { applyMiddleware, run } from 'larkspur';

// Run a build before the command unless --no-build is passed
//
// The handler function only has access to the build flag, and will not be able
// to read values for flags from other middleware or the wrapped command.
const preBuild = C.middleware(
  'Build the app before running a command',
  { build: C.flag('boolean', 'Build the app', { default: true }) },
  async (next, { flags }) => {
    if (flags.build) {
      await runAppBuild();
    }

    await next();
  }
);

// Log the execution time of a task
//
// This runs code before and after the execution of the command, since calling
// `await next()` invokes the command.  It uses the full path to the command to
// generate labels like "test > unit".
const profile = C.middleware(
  'Profile the execution of a task',
  async (next, { command }) => {
    const label = command.join(' > ');

    console.time(label);
    await next();
    console.timeEnd(label);
  }
);

// Report any command errors to a theoretical tracking system
//
// This uses a try/catch block to forward an error in the case of a crash but
// otherwise acts as transparent middleware.
const reportErrors = C.middleware(
  'Report errors to an external system',
  async next => {
    try {
      await next();
    } catch (error) {
      await reportCommandError(error);
      throw error;
    }
  }
);

// Apply middleware to different levels of the CLI
//
// This results in the following middleware chains for each command:
//
//   lint             | reportErrors > profile
//   noop             | reportErrors
//   test integration | reportErrors > profile > preBuild
//   test unit        | reportErrors > profile > preBuild
//
// Middleware commands are called from left to right, so profiling will include
// any time spent pre-building the application before running tests.
const cli = applyMiddleware([reportErrors], C.tree({
  lint: applyMiddleware(
    [profile],
    C('Run the linter', runLinter)
  ),

  noop: C('An empty command', () => {}),

  test: applyMiddleware(
    [profile, preBuild],
    C.group('Run tests', {
      integration: C('Run integration tests', runIntegrationTests),
      unit: C('Run unit tests', runUnitTests),
    })
  )
}));

await run(cli);
```

The use of nested `applyMiddleware` calls allows you to compose stacks of middleware, with `reportErrors` applied to the entire stack but `preBuild` only running on the commands within the `test` group.

### Defining Middleware

Middleware commands are defined using the `C.middleware` function.  This offers the following signatures:

* `C.middleware(description, handler)`: Define action-only middleware
* `C.middleware(description, flags, handler)`: Define middleware that adds flags to any wrapped commands and can access them in its handler

A middleware handler is an async function that is given a `next` function and a context object.  A handler must call and await `next` to run the next action in the chain; not doing so will throw an error.  The context object has the following fields:

* `command`: The full path to the command as a list of strings, such as `['test', 'unit']`
* `flags`: Parsed flag values, if the middleware defines flags

Middleware that uses flags will only be able to access the values of those flags in its handler function, and will not see flag values from other middleware or the wrapped command.  If you're using Larkspur in TypeScript, the type of `flags` will reflect this.

### Applying Middleware

Middleware can be applied to a command, command group, or an entire CLI using the `applyMiddleware` function.  When called with a group or CLI, this function deeply applies a stack of middleware to every child command.  Middleware functions are applied from left to right, with the first entry in the middleware stack being called first.

## TypeScript

Larkspur is written in TypeScript and is at its best when consumed via a `.ts` file, which gives you access to constraints around command and flag definitions and narrowly typed flag values in handlers.

### Public Types

Most Larkspur CLIs can rely exclusively on type inference for the command and flag definitions produced by the `C` factory functions.  However, if you're dynamically building commands or using helper functions to reduce duplication, the following types may be useful:

* `Command`: A command handler or group within a tree
* `CommandGroup`: A group of subcommands
* `CommandHandler`: A command with a handler function and flags
* `CommandTree`: A tree of named commands passed to `run`
* `Flag`: A single flag definition
* `Flags`: A set of named flags
* `ValuesOf`: Calculate the parsed values for a `Flags` type

### Typed Helpers

In addition to the types above, there are two factories on the `C` object that are useful to TS code building up a CLI in pieces:

* `C.flags`: Define a set of named flags whose exact keys and individual flag types are preserved
* `C.tree`: Require an input object to be a command tree

These are lightweight functions that return the input data without transformations but provide you with improved type information and constraints.

### Dynamic CLIs

Here's a somewhat contrived example that shows how to combine Larkspur's public types and API functions to safely define a dynamic CLI:

```ts
import C, { type CommandTree, run, type ValuesOf } from 'larkspur';

// A list of environments that will become command groups
const envs = ['development', 'staging', 'production'];

// Flags shared across commands
//
// The use of C.flags preserves the specific shape of these flags, allowing the
// rest of this example to know about the host and verbose flags and their
// values at compile time.
const sharedFlags = C.flags({
  host: C.flag('string', 'A remote host', { required: true }),
  verbose: C.flag('boolean', 'Show verbose output')
});

// Build shared options for a theoretical host-management library
//
// This takes parsed flags provided to command handlers and resolves them to
// options. Since sharedFlags is a narrow type, ValuesOf gives flags the
// following shape:
//
//   { host: string; verbose: boolean; }
//
// If { required: true } were omitted from the definition of the host flag, the
// host property would instead be an optional string.
function buildOptions(flags: ValuesOf<typeof sharedFlags>) {
  return {
    host: flags.host,
    quiet: !flags.verbose
  };
}

// Build commands to manage hosts in an environment
//
// The use of C.tree ensures that the returned object is a tree of command
// groups and handlers.  Each command uses the shared flags declared earlier,
// and transforms them into shared options.  Since the flags provided to command
// handlers are narrowly typed, these flags satisfy the parameter annotation of
// flags in buildOptions.
function buildHostCommands(env: string) {
  return C.tree({
    deploy: C(
      'Deploy to a host',
      {
        ...sharedFlags,
        branch: C.flag('string', 'The branch to deploy')
      },
      flags => deployToHost({
        ...buildOptions(flags),
        branch: flags.branch, // Typed as an optional string
        env
      })
    ),

    restart: C(
      'Restart a host',
      sharedFlags,
      flags => restartHost({ ...buildOptions(flags), env })
    )
  });
}

// Build commands for each environment
//
// This uses the CommandTree type to constrain the returned tree, adding a
// command group for each environment whose child commands are themselves
// correctly formed command trees.
function buildEnvironmentCommands(): CommandTree {
  return envs.reduce<CommandTree>(function(tree, env) {
    tree[env] = C.group(
      `Manage the ${env} environment`,
      buildHostCommands(env)
    );

    return tree;
  }, {});
}

// Run the valid command tree
await run(buildEnvironmentCommands());
```

## Why the Name?

In [floristry](https://www.instagram.com/justinlocsei/), larkspur is used as a *line* flower.  I find it to be particularly beautiful, so you could even say that it *commands* one's attention.
