import { homedir } from 'node:os';
import path from 'node:path';

/**
 * Expand a filesystem path
 */
export function expandPath(...parts: string[]): string {
  return path.normalize(path.join(...parts)).replace(/^~/, homedir());
}
