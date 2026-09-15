import { homedir } from 'node:os';
import path from 'node:path';

const HOME_PREFIX = /^~[/\\]/;

/**
 * Expand a filesystem path
 */
export function expandPath(...parts: string[]): string {
  const joined = path.normalize(path.join(...parts));

  if (joined === '~') {
    return homedir();
  } else if (HOME_PREFIX.test(joined)) {
    return path.join(homedir(), joined.slice(2));
  } else {
    return joined;
  }
}
