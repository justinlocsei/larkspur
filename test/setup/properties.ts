import { fc } from '@fast-check/vitest';

import { getConfigVariable } from '../../src/tests/properties/config.ts';

const testRuns = getConfigVariable('LARKSPUR_PROP_TEST_RUNS');
const testSeed = getConfigVariable('LARKSPUR_PROP_TEST_SEED');

fc.configureGlobal({
  numRuns: testRuns ? Number(testRuns) : 100,
  seed: testSeed ? Number(testSeed) : undefined
});
