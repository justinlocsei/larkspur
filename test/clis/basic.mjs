#!/usr/bin/env node
// @ts-check

import C, { run } from 'larkspur';

await run({
  alfa: C('Show a value', async () => {
    console.log('one');
  }),

  bravo: C('Show a value', async () => {
    console.log('two');
  })
});
