import { OperationalError } from '../../src/errors.ts';
import { localFile } from './paths.ts';

import fs from 'node:fs';

/**
 * Extract the body of a version section from the changelog
 */
function extractSection(changelog: string, version: string): string {
  const heading = `## [${version}]`;

  const lines = changelog.split('\n');
  const start = lines.findIndex(line => line.startsWith(heading));

  if (start === -1) {
    throw new OperationalError(
      `No changelog section found for version ${version}`
    );
  }

  const body: string[] = [];

  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## [') || line.startsWith('[')) {
      break;
    }

    body.push(line);
  }

  return body.join('\n').trim();
}

/**
 * Build release notes using a version's changelog section
 */
export function buildReleaseNotes(version: string): string {
  return extractSection(
    fs.readFileSync(localFile('CHANGELOG.md'), 'utf8'),
    version
  ).replace(/\[(#\d+)\]/g, '$1');
}
