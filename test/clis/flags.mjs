#!/usr/bin/env node
// @ts-check

import C, { run } from 'larkspur';

const desc = 'A flag';

await run({
  defaults: C(
    'Show flags with default values',
    {
      boolean: C.flag('boolean', desc, { default: true }),
      number: C.flag('number', desc, { default: 1 }),
      string: C.flag('string', desc, { default: 'alfa' })
    },
    async (flags) => {
      console.log(JSON.stringify(flags));
    }
  ),

  mixed: C(
    'Show a mixture of optional and required flags',
    {
      number: C.flag('number', desc),
      string: C.flag('string', desc, { required: true })
    },
    async (flags) => {
      console.log(JSON.stringify(flags));
    }
  ),

  optional: C(
    'Show optional flags',
    {
      boolean: C.flag('boolean', desc),
      number: C.flag('number', desc),
      string: C.flag('string', desc)
    },
    async (flags) => {
      console.log(JSON.stringify(flags));
    }
  ),

  required: C(
    'Show required flags',
    {
      number: C.flag('number', desc, { required: true }),
      string: C.flag('string', desc, { required: true })
    },
    async (flags) => {
      console.log(JSON.stringify(flags));
    }
  )
});
