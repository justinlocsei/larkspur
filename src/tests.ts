import type { LogLevel } from './cli.js';
import { createContext } from './context.js';
import type { Context, Metadata } from './types.js';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export * as ensure from './tests/assertions.js';
export * as T from './tests/types.js';

/**
 * Produce a readable representation of an object
 */
export function inspect(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/**
 * Ensure that each input produced the expected output
 */
export function checkConversion<I, O>(
  check: (input: I, output: O, message: string) => void,
  cases: Array<[I, O]>
): void {
  for (const [input, output] of cases) {
    check(
      input,
      output,
      `Input did not produce the expected output: ${inspect(input)}\n${
        inspect(output)
      }`
    );
  }
}

/**
 * Asynchronously run assertions on a set of inputs with expected outputs
 */
export async function checkConversionAsync<I, O>(
  check: (input: I, output: O, message: string) => Promise<void>,
  cases: Array<[I, O]>
): Promise<void> {
  for (const [input, output] of cases) {
    await check(
      input,
      output,
      `Unexpected output for input: ${inspect(input)}`
    );
  }
}

/**
 * Create a temporary directory
 */
export async function createTempDir(): Promise<string> {
  let prefix = await fs.realpath(os.tmpdir());

  if (!prefix.endsWith(path.sep)) {
    prefix += path.sep;
  }

  const tmpDir = await fs.mkdtemp(prefix);
  await fs.chmod(tmpDir, 0o700);

  return tmpDir;
}

/**
 * Create a test context
 */
export function createTestContext(
  meta: Partial<Metadata> = {}
): Context {
  return createContext({
    name: 'testing',
    ...meta
  });
}

/**
 * Captured output from a test
 */
type CapturedOutput = Record<LogLevel, string>;

/**
 * Capture CLI logging output in tests
 */
export function testLogging() {
  const output: CapturedOutput = { error: '', info: '' };

  return {
    getOutput: (): CapturedOutput => output,
    logging: {
      error: (m = '') => {
        output.error += m && `${m}\n`;
      },
      info: (m = '') => {
        output.info += m && `${m}\n`;
      }
    }
  };
}

/**
 * Allow a caller to use a temporary directory
 */
export async function useTempDir<T>(
  useDir: (path: string) => Promise<T>
): Promise<T> {
  const tmpDir = await createTempDir();

  try {
    return await useDir(tmpDir);
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
}

/**
 * Allow a caller to use a temporary file
 */
export function useTempFile<T>(
  useFile: (path: string) => Promise<T>,
  { name = 'file' }: { name?: string } = {}
): Promise<T> {
  return useTempDir(d => useFile(path.join(d, name)));
}
