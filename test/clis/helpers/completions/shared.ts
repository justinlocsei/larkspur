import type { SupportedShell } from '../../../../src/completions/shells.js';

export type { SupportedShell };

/**
 * The context available for a completions test
 */
type TestRunnerContext = {
  file: string;
  inputs: string[];
  script: string;
};

/**
 * A function that returns shell completions under test
 */
export type TestRunner = (
  context: TestRunnerContext
) => Promise<string[]>;

/**
 * A shell and a test harness for its completions
 */
export type ShellWithCompletions = {
  name: SupportedShell;
  test: TestRunner;
};
