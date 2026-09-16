import path from 'node:path';

let rootDir: string | undefined;

/**
 * Produce a platform-appropriate absolute path
 */
export function abs(...segments: string[]): string {
  return path.join(filesystemRoot(), ...segments);
}

/**
 * The filesystem root for the current platform
 */
export function filesystemRoot(): string {
  rootDir ??= path.parse(process.cwd()).root;

  return rootDir;
}
