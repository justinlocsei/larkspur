# Larkspur

Zero-dependency TypeScript CLI library: nested commands, long-flag-only parsing, help, shell completions, and command discovery. Library source is `src/`; the dev task CLI is `tasks/`, invoked as `./bin/larkspur`.

Public API: `src/index.ts` exports `run`, default `C`, `OperationalError`, and curated types (see README “Public types”).

## Exports

Be conservative about what gets exported. Only export a type or function when another module in this repo genuinely needs it, or when explicitly requested as part of the public API in `src/index.ts`. Do not preemptively export helpers, types, or utilities “just in case” — keep symbols module-local until there is a concrete internal consumer or an intentional API decision.

## Dev commands

Run `./bin/larkspur explore` to list tasks and flags. Prefer `./bin/larkspur` over npm scripts in docs and CI.

Before finishing work:

```sh
./bin/larkspur check
./bin/larkspur test all
./bin/larkspur publish preflight   # when packaging or publish-related code changed
```

Filter tests with `--file` (Vitest file pattern) or `--name` (test name pattern). Coverage: `./bin/larkspur test coverage` (100% thresholds on `src/`; see `vitest.config.ts`).

## Testing

| Suite | Location | Notes |
|-------|----------|-------|
| Unit | `src/**/*.test.ts` beside source | |
| Property | `src/**/*.prop.test.ts` | Vitest project `properties`; `./bin/larkspur test property` |
| Integration | `test/clis/` | Requires **zsh** and **ncurses-term**; spawns real CLI subprocesses |

Use `createTestContext()` from `src/tests.ts` (`explore: false` / `completions: false` to disable built-ins). Use `ensure` and `checkConversion()` from `src/tests.ts` for shared assertion helpers.

After editing a source file, run its matching test file when one exists.

## Code style

- Strict TypeScript; `.ts` import extensions
- **Biome** (lint + import organize) and **dprint** (format)
- `import type` for type-only imports
- Sort keys alphabetically in plain object literals
- Comments only for non-obvious logic; minimize scope; match existing patterns
- Do not reword existing code comments — leave their wording unchanged unless the underlying behavior changed and the comment is no longer accurate

## Library internals

Commands use the `C` factory (`src/factory.ts`): leaf handler, flags + handler, `C.group`, and `C.flag`.

Built-in commands (`explore`, `completions`) are injected by `withBuiltInCommands()` in `src/built-ins.ts` — wired through `src/runner.ts`.

Config types: `src/types/config.ts`. Validation: `src/validation.ts`, `src/config.ts`.

Published `dist/` contains only `index.mjs` and `index.d.mts` (no source maps in the tarball).

When changing commands, flags, or completions, update unit tests and shell completion expectations (`test/clis/completions.test.ts` covers bash and zsh).

Useful utilities: `compact`, `requireProperty`, `requireMapKey` (`src/utils.ts`); tagged unions via `Variant` (`src/types/utils.ts`).
