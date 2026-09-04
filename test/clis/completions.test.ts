import { listShellsWithCompletions } from './helpers/completions.js';
import type { CustomTests } from './helpers.js';
import { assert, test, testCLI } from './helpers.js';

const cases: Array<[string[], string[]]> = [
  [['alfa', '--env', ' '], ['alfa-dev', 'alfa-prod', 'alfa-staging']],
  [['alfa', '--env', 'alfa-d'], ['alfa-dev']],
  [['alfa', '--env', 'bravo-d'], []],
  [['bravo', '--env', ' '], ['bravo-dev', 'bravo-prod']],
  [['bravo', '--env', 'bravo-d'], ['bravo-dev']],
  [['bravo', '--env', 'alfa-d'], []],
  [['alfa', '--env='], ['alfa-dev', 'alfa-prod', 'alfa-staging']],
  [['alfa', '--env=alfa-d'], ['alfa-dev']],
  [['bravo', '--env='], ['bravo-dev', 'bravo-prod']]
];

const tests: CustomTests = {};

for (const shell of listShellsWithCompletions()) {
  const { name } = shell;

  tests[`provides values for ${name} completions`] = async ({ run }) => {
    const result = run(
      'completions',
      'provide',
      '--flag',
      'alfa:env',
      '--current',
      'alfa-d',
      '--shell',
      name
    );

    assert.sameMembers(
      result.stdout.split('\n').filter(Boolean),
      ['alfa-dev'],
      `shell: ${name}`
    );

    assert.equal(result.status, 0, `shell: ${name}`);
  };

  tests[`supports ${name} completions`] = async () => {
    const result = testCLI(
      'completions',
      'completions',
      'generate',
      '--shell',
      name
    );

    assert.equal(result.status, 0);
    assert.isEmpty(result.stderr);

    for (const [inputs, expected] of cases) {
      const actual = await shell.test({
        file: 'completions',
        inputs,
        script: result.stdout
      });

      assert.sameMembers(
        actual,
        expected,
        `${name} completions for: ${inputs.join(' ')}`
      );
    }
  };
}

test('completions', tests);
