import { readFileSync, writeFileSync } from 'node:fs';

const TOC_END = '<!-- </toc> -->';
const TOC_START = '<!-- <toc> -->';

const HEADING = /^(#{2,})\s+([^\n]+?)\s*$/;

/**
 * A Markdown heading
 */
type Heading = {
  level: number;
  slug: string;
  title: string;
};

/**
 * Refresh the table of contents in the README
 *
 * @returns Whether the table of contents was updated
 */
export function refreshTableOfContents(readme: string): boolean {
  const content = readFileSync(readme, 'utf8');

  const headings = listHeadings(content.split('\n'));
  const toc = renderTableOfContents(headings).join('\n');

  const updated = replaceTableOfContents(content, toc);
  const changed = updated !== content;

  if (changed) {
    writeFileSync(readme, updated);
  }

  return changed;
}

/**
 * List Markdown headings in the README
 */
function listHeadings(lines: string[]): Heading[] {
  const slugs = new Set<string>();

  return lines.reduce<Heading[]>((headings, line) => {
    const match = HEADING.exec(line);
    const [, hashes, title] = match ?? [];

    if (hashes && title) {
      const slug = slugFor(title);

      if (slugs.has(slug)) {
        throw new Error(`Duplicate slug: ${slug}`);
      } else {
        slugs.add(slug);
      }

      headings.push({
        level: hashes.length,
        slug,
        title
      });
    }

    return headings;
  }, []);
}

/**
 * Build a GitHub-compatible slug for a heading title
 */
function slugFor(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Render a nested table of contents from extracted headings
 */
function renderTableOfContents(headings: Heading[]): string[] {
  function renderLevel(
    index: number,
    level: number
  ): [string[], number] {
    const lines: string[] = [];

    while (index < headings.length) {
      const heading = headings[index];

      if (!heading || heading.level < level) {
        break;
      }

      const indent = '  '.repeat(heading.level - 2);
      lines.push(`${indent}- [${heading.title}](#${heading.slug})`);

      index++;
      const next = headings[index];

      if (next && next.level > level) {
        const [nested, nextIndex] = renderLevel(index, level + 1);

        lines.push(...nested);
        index = nextIndex;
      }
    }

    return [lines, index];
  }

  return renderLevel(0, 2)[0];
}

/**
 * Replace the table of contents in a README
 */
function replaceTableOfContents(readme: string, toc: string): string {
  const start = readme.indexOf(TOC_START);
  const end = readme.indexOf(TOC_END);

  if (start === -1 || end === -1 || end < start) {
    throw new Error('README is missing TOC markers');
  }

  return [
    readme.slice(0, start + TOC_START.length),
    `\n${toc}\n`,
    readme.slice(end)
  ].join('');
}
