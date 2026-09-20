import type { UserCompletion } from '../../src/flags/types.ts';
import { captureOutput } from './commands.ts';

const VERSION_TAG = /^v(\d+\.\d+\.\d+)$/;

/**
 * Extract a version number from a tag name
 */
function tagToVersion(tag: string): string | undefined {
  const version = VERSION_TAG.exec(tag.trim())?.[1];

  return version?.split('.')
    .map(p => Number(p))
    .join('.');
}

/**
 * Get a list of available versions from git tags
 */
function listVersionTags(): string[] {
  return captureOutput('git', ['tag', '-l', 'v*'])
    .stdout
    .split('\n')
    .map(tagToVersion)
    .filter((v): v is string => v !== undefined);
}

/**
 * Use all version tags as completions
 */
export const completeVersions: UserCompletion = ({ current }) => {
  return listVersionTags()
    .filter(v => v.startsWith(current))
    .sort((l, r) => r.localeCompare(l, undefined, { numeric: true }));
};
