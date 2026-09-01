import C, { run } from 'larkspur';

await run({
  alfa: C('Valid', async () => {}),
  bravo: C('Valid', async () => {}),
  '-charlie': C('Invalid', async () => {})
});
