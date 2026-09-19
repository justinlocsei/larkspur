#!/usr/bin/env node
// @ts-check

import C, { run } from 'larkspur';

await run({
  alfa: C.group('Valid', {
    bravo: C.group('Valid', {
      charlie: C(
        'Valid',
        { delta: C.flag('boolean', 'Valid') },
        () => {}
      ),
      echo: C(
        'Valid',
        { '-foxtrot': C.flag('boolean', 'Invalid') },
        () => {}
      )
    })
  }),

  bravo: C('Valid', () => {}),

  '-charlie': C('Invalid', () => {}),

  '-golf': C(
    'Invalid',
    { '-hotel': C.flag('boolean', 'Invalid') },
    () => {}
  )
});
