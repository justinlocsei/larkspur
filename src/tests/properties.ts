import { fc } from '@fast-check/vitest';

export { singleCommand } from './properties/commands.js';
export { flag, flags } from './properties/flags.js';
export { flagName, identifier } from './properties/identifiers.js';

export const argv = fc.array(
  fc.string({ maxLength: 40 }),
  { maxLength: 20 }
);
