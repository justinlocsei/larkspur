#!/usr/bin/env node
// @ts-check

import C, { applyMiddleware, run } from 'larkspur';

const around = C.middleware(
  'Log before and after a command',
  async (next, { command }) => {
    const path = command.join(':');

    console.log(`around:before:${path}`);
    await next();
    console.log(`around:after:${path}`);
  }
);

const before = C.middleware(
  'Log before a command',
  async (next, { command }) => {
    console.log(`before:${command.join(':')}`);
    await next();
  }
);

const after = C.middleware(
  'Log after a command',
  async (next, { command }) => {
    await next();
    console.log(`after:${command.join(':')}`);
  }
);

const alfaFlags = C.middleware(
  'Provide the alfa flag',
  { alfa: C.flag('string', 'Alfa') },
  async (next, { flags }) => {
    console.log(JSON.stringify(Object.entries(flags)));
    await next();
  }
);

const bravoFlags = C.middleware(
  'Provide the bravo flag',
  { bravo: C.flag('string', 'Bravo') },
  async (next, { flags }) => {
    console.log(JSON.stringify(Object.entries(flags)));
    await next();
  }
);

const cli = applyMiddleware(
  [around],
  C.tree({
    group: applyMiddleware(
      [before, after],
      C.group('A command group', {
        nested: C('A nested command', async () => {
          console.log('command:group:nested');
        })
      })
    ),

    plain: C('A plain command', () => {
      console.log('command:plain');
    }),

    single: applyMiddleware(
      [before, after],
      C('A single command', () => 'command:single')
    ),

    flagged: applyMiddleware(
      [alfaFlags, bravoFlags],
      C('A flagged command', () => 'command:flagged')
    )
  })
);

await run(cli);
