import { assert, it } from 'vitest';

import { parseCompletions } from '../../src/completions/output.ts';
import type { SupportedShell } from '../../src/completions/shells.ts';
import type { CompletionCase } from './helpers/shells.ts';
import { runShellCompletions } from './helpers/shells.ts';

import { spawnSync } from 'node:child_process';
import path from 'node:path';

export { assert };

/**
 * The result of a CLI test
 */
type TestResult = {
  status: number | null;
  stderr: string;
  stdout: string;
};

/**
 * Test a CLI
 */
export function testCLI(name: string, ...args: string[]): TestResult {
  const file = path.join(import.meta.dirname, `${name}.mjs`);

  const { status, stderr, stdout } = spawnSync(process.execPath, [
    file,
    ...args
  ]);

  return {
    status,
    stderr: stderr?.toString() ?? '',
    stdout: stdout?.toString() ?? ''
  };
}

/**
 * A function that invokes a CLI
 */
type RunCLI = (...args: string[]) => TestResult;

/**
 * A function that gets the output of a successful CLI run
 */
type CheckOutput = (...args: string[]) => string;

/**
 * A function to test shell completions
 */
type TestCompletions = (
  shell: SupportedShell,
  cases: CompletionCase[]
) => Promise<void>;

/**
 * The actions available for custom tests
 */
export type TestActions = {
  checkOutput: CheckOutput;
  run: RunCLI;
  testCompletions: TestCompletions;
};

/**
 * Custom tests for a CLI
 */
export type CustomTests = Partial<
  Record<string, (actions: TestActions) => void | Promise<void>>
>;

export const parseProvideOutput = parseCompletions;

/**
 * Define tests for a CLI
 */
export function test(
  file: string,
  tests: CustomTests = {},
  { valid = true }: { valid?: boolean } = {}
): void {
  const run: RunCLI = (...args) => testCLI(file, ...args);

  const checkOutput: CheckOutput = (...args) => {
    const result = run(...args);

    assert.equal(result.status, 0);
    assert.isEmpty(result.stderr);

    return result.stdout;
  };

  const testCompletions: TestCompletions = async (shell, cases) => {
    const script = run('completions', 'generate', '--shell', shell);

    assert.equal(script.status, 0);
    assert.isEmpty(script.stderr);

    for (const [inputs, outputs] of cases) {
      assert.sameMembers(
        await runShellCompletions(shell, {
          cliName: file,
          inputs,
          script: script.stdout
        }),
        outputs,
        `${shell} completions for: ${inputs.join(' ')}`
      );
    }
  };

  const actions: TestActions = { checkOutput, run, testCompletions };

  if (valid) {
    it('shows help', () => {
      assert.include(checkOutput('--help'), '--help');
    });
  }

  Object.entries(tests).forEach(([name, test]) => {
    if (test) {
      it(name, async () => {
        await test(actions);
      });
    }
  });
}
