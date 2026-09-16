import C from '../src/factory.ts';
import { run } from './helpers/commands.ts';

/**
 * Build the project
 */
export function build(): void {
  run('tsdown');
}

export default C('Build Larkspur', build);
