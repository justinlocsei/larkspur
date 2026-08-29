import C, { run } from 'larkspur';

await run({
  status: C('Show status', async () => {
    console.log('valid');
  })
});
