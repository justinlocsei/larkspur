import { useTempDir } from '../../../src/tests.ts';

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * A test for shell completions
 */
export type CompletionsTest = {
  cliName: string;
  files: string[];
  inputs: string[];
  script: string;
};

/**
 * A concrete run of completion tests
 */
export type CompletionsTestRun = CompletionsTest & {
  preamble: string[];
  rootDir: string;
  runDir: string;
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
  return useTempDir(async rootDir => {
    const runDir = path.join(rootDir, 'run');
    await fs.mkdir(runDir);

    const cliPath = path.join(import.meta.dirname, '..', `${test.cliName}.mjs`);

    for (const file of test.files) {
      await fs.writeFile(path.join(runDir, file), '');
    }

    await fs.writeFile(
      path.join(rootDir, path.basename(cliPath, '.mjs')),
      [
        '#!/usr/bin/env sh',
        `exec ${process.execPath} ${JSON.stringify(cliPath)} "$@"`
      ].join('\n'),
      { mode: 0o755 }
    );

    return run({
      ...test,
      rootDir,
      runDir,
      preamble: [`export PATH=${JSON.stringify(rootDir)}:$PATH`]
    });
  });
}
