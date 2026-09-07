import { fc } from '@fast-check/vitest';

export { entryPoint, singleCommand } from './properties/commands.ts';
export { description, flagName, identifier } from './properties/definition.ts';
export { flags } from './properties/flags.ts';

export const argv = fc.array(
  fc.string({ maxLength: 40 }),
  { maxLength: 20 }
);
