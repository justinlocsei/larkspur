import C, { run } from 'larkspur';

const alfa = ['alfa-dev', 'alfa-prod', 'alfa-staging'];
const beta = ['bravo-dev', 'bravo-prod'];

await run({
  alfa: C(
    'Alfa',
    {
      env: C.flag('string', 'Alfa', {
        completion: ({ current }) => alfa.filter(v => v.startsWith(current))
      })
    },
    async ({ env }) => {
      console.log(`alfa:${env}`);
    }
  ),

  bravo: C(
    'Bravo',
    {
      env: C.flag('string', 'Bravo', {
        completion: ({ current }) => beta.filter(v => v.startsWith(current))
      })
    },
    async ({ env }) => {
      console.log(`bravo:${env}`);
    }
  )
});
