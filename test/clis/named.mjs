import C, { run } from 'larkspur';

await run(
  { test: C('Test a command', async () => {}) },
  {
    description: '@description',
    name: 'custom-cli-name'
  }
);
