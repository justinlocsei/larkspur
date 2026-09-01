import { homedir } from 'node:os';
import path from 'node:path';

const HOME_RELATIVE_PATH = /^~[/\\](.*)/;

/**
 * Expand a filesystem path
 */
export function expandPath(...parts: string[]): string {
  const joined = path.normalize(path.join(...parts));

  if (joined === '~') {
    return homedir();
  }

  const match = HOME_RELATIVE_PATH.exec(joined);

  return match
    ? path.join(homedir(), match[1] ?? '')
    : joined;
}
