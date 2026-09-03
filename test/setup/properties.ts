import { fc } from '@fast-check/vitest';

const {
  LARKSPUR_PROP_TEST_RUNS: testRuns,
  LARKSPUR_PROP_TEST_SEED: testSeed
} = process.env;

fc.configureGlobal({
  numRuns: testRuns ? Number(testRuns) : 100,
  seed: testSeed ? Number(testSeed) : undefined
});
