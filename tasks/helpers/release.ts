import { OperationalError } from '../../src/errors.ts';
import { captureOutput } from './commands.ts';
import { localFile } from './paths.ts';

import fs from 'node:fs';

/**
 * A commit that references a PR
 */
type PRCommit = {
  number: number;
  title: string;
};

const CHANGELOG_PATH = localFile('CHANGELOG.md');
const REPOSITORY_URL = 'https://github.com/justinlocsei/larkspur';

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
    fs.readFileSync(CHANGELOG_PATH, 'utf8'),
    version
  ).replace(/\[(#\d+)\]/g, '$1');
}

/**
 * Extract the latest version from the changelog
 */
function extractLatestVersion(changelog: string): string {
  const match = changelog.match(/^## \[([^\]]+)\]/m);
  const version = match?.[1];

  if (!version) {
    throw new OperationalError(
      'Could not determine the latest version from the changelog'
    );
  }

  return version;
}

/**
 * Attempt to extract a commit that references a pull request
 */
function extractPRCommit(subject: string): PRCommit | undefined {
  const match = subject.match(/^(.+?)\s+\(#(\d+)\)$/);

  const number = match?.[2];
  const title = match?.[1];

  return number && title
    ? { number: Number(number), title }
    : undefined;
}

/**
 * Insert a version section before the current latest version
 */
function insertVersionSection(
  changelog: string,
  version: string,
  commits: PRCommit[]
): string {
  const lines = changelog.split('\n');
  const versionsAt = lines.findIndex(line => /^## \[[^\]]+\]/.test(line));

  if (versionsAt === -1) {
    throw new OperationalError('No versions were found in the changelog');
  }

  const date = new Date().toISOString().slice(0, 10);

  return [
    ...lines.slice(0, versionsAt),
    `## [${version}] (${date})`,
    '',
    ...commits.map(c => `- ${c.title} ([#${c.number}])`),
    '',
    ...lines.slice(versionsAt)
  ].join('\n');
}

/**
 * Add a version to the top of the reference list
 */
function addVersionReference(
  changelog: string,
  version: string,
  previousVersion: string
): string {
  const lines = changelog.split('\n');
  const versionsAt = lines.indexOf('<!-- Versions -->');

  if (versionsAt === -1) {
    throw new OperationalError('Changelog versions footer not found');
  }

  return [
    ...lines.slice(0, versionsAt + 2),
    `[${version}]: ${REPOSITORY_URL}/compare/v${previousVersion}..v${version}`,
    ...lines.slice(versionsAt + 2)
  ].join('\n');
}

/**
 * Add PRs to the end of the reference list
 */
function addPRReferences(
  changelog: string,
  commits: PRCommit[]
): string {
  const prs = commits
    .sort((l, r) => l.number - r.number)
    .map(c => `[#${c.number}]: ${REPOSITORY_URL}/pull/${c.number}`);

  return `${changelog.trim()}\n${prs.join('\n')}\n`;
}

/**
 * Update the changelog with the commits since the previous release
 */
export function updateChangelog(version: string): void {
  const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const previousVersion = extractLatestVersion(changelog);

  const gitLog = captureOutput('git', [
    'log',
    `v${previousVersion}..HEAD`,
    '--format=%s'
  ]);

  const commits = gitLog
    .stdout
    .split('\n')
    .map(extractPRCommit)
    .filter((c): c is PRCommit => c !== undefined);

  const updated = addPRReferences(
    addVersionReference(
      insertVersionSection(changelog, version, commits),
      version,
      previousVersion
    ),
    commits
  );

  fs.writeFileSync(CHANGELOG_PATH, updated);
}
