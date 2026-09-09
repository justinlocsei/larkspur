import { fc } from '@fast-check/vitest';

import { getConfigVariable } from '../../src/tests/properties/config.ts';

const runs = getConfigVariable('runs');
const seed = getConfigVariable('seed');

fc.configureGlobal({
  numRuns: runs ? Number(runs) : 100,
  seed: seed ? Number(seed) : undefined
});
