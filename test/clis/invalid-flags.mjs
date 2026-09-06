import C, { run } from 'larkspur';

await run({
  alfa: C.group('Valid', {
    bravo: C.group('Valid', {
      charlie: C(
        'Valid',
        { delta: C.flag('boolean', 'Valid') },
        async () => {}
      ),
      echo: C(
        'Valid',
        { '-foxtrot': C.flag('boolean', 'Invalid') },
        async () => {}
      )
    })
  })
});
