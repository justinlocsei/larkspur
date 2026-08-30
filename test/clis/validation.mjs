import C, { run } from 'larkspur';

const desc = 'A flag';

await run({
  choices: C(
    'Validate flags using choices',
    {
      numbers: C.flag('choice', desc, { choices: [1, 2] }),
      strings: C.flag('choice', desc, { choices: ['alfa', 'bravo'] })
    },
    async () => {}
  ),

  fns: C(
    'Validate flags with validator functions',
    {
      number: C.flag('number', desc, { isValid: v => v === 1 }),
      string: C.flag('string', desc, { isValid: v => v === 'alfa' })
    },
    async () => {}
  ),

  types: C(
    'Validate flags by type',
    {
      number: C.flag('number', desc),
      string: C.flag('string', desc)
    },
    async () => {}
  )
});
