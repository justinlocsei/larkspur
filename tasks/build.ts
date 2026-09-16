import C from '../src/factory.ts';
import { npx } from './helpers/commands.ts';

/**
 * Build the project
 */
export function build(): void {
  npx('tsdown');
}

export default C('Build Larkspur', build);
