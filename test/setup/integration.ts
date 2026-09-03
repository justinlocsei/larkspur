import { execFileSync } from 'node:child_process';

/**
 * Build Larkspur to allow CLI tests to load it
 */
export default function setup(): void {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
}
