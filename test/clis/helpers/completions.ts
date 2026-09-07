import { useTempDir } from '../../../src/tests.ts';

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * A test for shell completions
 */
export type CompletionsTest = {
  cliName: string;
  inputs: string[];
  script: string;
};

/**
 * A concrete run of completion tests
 */
export type CompletionsTestRun = CompletionsTest & {
  dir: string;
  preamble: string[];
};

/**
 * A shell-specific test for completions
 */
export type CompletionsTester = (run: CompletionsTestRun) => Promise<string[]>;

/**
 * Test shell completions
 */
export async function testCompletions(
  test: CompletionsTest,
  run: CompletionsTester
): Promise<string[]> {
  return useTempDir(async dir => {
    const cliPath = path.join(import.meta.dirname, '..', `${test.cliName}.mjs`);

    await fs.writeFile(
      path.join(dir, path.basename(cliPath, '.mjs')),
      [
        '#!/usr/bin/env sh',
        `exec ${process.execPath} ${JSON.stringify(cliPath)} "$@"`
      ].join('\n'),
      { mode: 0o755 }
    );

    return run({
      ...test,
      dir,
      preamble: [`export PATH=${JSON.stringify(dir)}:$PATH`]
    });
  });
}
