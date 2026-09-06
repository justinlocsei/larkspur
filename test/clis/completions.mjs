import C, { run } from 'larkspur';

await run({
  bare: C('@bare-handler', async () => {}),
  flags: C(
    '@flag-handler',
    { root: C.flag('string', '@root') },
    async () => {}
  ),
  group: C.group('@group\n@newline', {
    nested: C(
      '@nested',
      {
        count: C.flag('number', '@count'),
        custom: C.flag('string', '@custom', {
          completion: async () => ['custom-alfa', 'custom-bravo']
        }),
        disabled: C.flag('boolean', '@disabled'),
        enabled: C.flag('boolean', '@enabled', { default: true }),
        mode: C.flag('choice', '@mode', {
          choices: ['mode-alfa', 'mode-bravo']
        }),
        title: C.flag('string', "@title it's a: [value]")
      },
      async () => {}
    )
  })
});
