import { fc } from '@fast-check/vitest';

export { entryPoint, singleCommand } from './properties/commands.js';
export { flagName, identifier } from './properties/definition.js';
export { flags } from './properties/flags.js';

export const argv = fc.array(
  fc.string({ maxLength: 40 }),
  { maxLength: 20 }
);
