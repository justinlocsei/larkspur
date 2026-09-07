import { fc } from '@fast-check/vitest';

import { IDENTIFIER_PATTERN, NEGATE_BOOLEAN } from '../../validation.ts';

export const identifier = fc.stringMatching(IDENTIFIER_PATTERN);

export const flagName = identifier.filter(name =>
  !name.startsWith(NEGATE_BOOLEAN)
);

export const description = fc.string({ unit: 'grapheme', minLength: 1 });
