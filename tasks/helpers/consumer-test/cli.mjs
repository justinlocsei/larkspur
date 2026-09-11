import C, { run } from 'larkspur';

await run(
  { check: C('Check the build', () => 'success') }
);
