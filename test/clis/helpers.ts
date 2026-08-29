import { assert, describe, it } from 'vitest';

import { COMPLETION_SHELLS } from '../../src/types.js';

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
export function testCLI(name: string, args: string[] = []): TestResult {
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
type CLIRunner = (...args: string[]) => TestResult;

/**
 * A function that gets the output of a successful CLI run
 */
type OutputChecker = (...args: string[]) => string;

/**
 * The API available for custom tests
 */
type TestAPI = {
  checkOutput: OutputChecker;
  run: CLIRunner;
};

/**
 * Custom tests for a CLI
 */
type CustomTests = Partial<Record<string, (api: TestAPI) => void>>;

/**
 * Define tests for a CLI
 */
export function test(
  file: string,
  description: string,
  tests: CustomTests = {}
): void {
  const run: CLIRunner = (...args: string[]) => testCLI(file, args);

  const checkOutput: OutputChecker = (...args: string[]) => {
    const result = run(...args);

    assert.equal(result.status, 0);
    assert.isEmpty(result.stderr);

    return result.stdout;
  };

  const api: TestAPI = { checkOutput, run };

  describe(description, () => {
    it('shows help', () => {
      assert.include(checkOutput('--help'), '--help');
    });

    for (const shell of COMPLETION_SHELLS) {
      it(`can generate ${shell} completions`, () => {
        assert.isNotEmpty(checkOutput('--complete', shell));
      });
    }

    Object.entries(tests).forEach(([name, test]) => {
      if (test) {
        it(name, () => {
          test(api);
        });
      }
    });
  });
}
