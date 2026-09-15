import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

/**
 * Produce the path to a node_modules executable
 */
export function localBin(name: string): string {
  return path.join(
    REPO_ROOT,
    'node_modules',
    '.bin',
    `${name}${process.platform === 'win32' ? '.cmd' : ''}`
  );
}

/**
 * Produce the path to a file relative to the repository root
 */
export function localFile(name: string): string {
  return path.join(REPO_ROOT, name);
}
