import { listShells } from '../../src/completions/shells.ts';
import { assert, parseProvideOutput, test } from './helpers.ts';

test('completions', {
  ...Object.fromEntries(
    listShells().flatMap(({ name }) => [
      [
        `supports flag completions for ${name}`,
        ({ run }) => {
          const result = run(
            'completions',
            'provide',
            '--flag',
            'group:nested:custom',
            '--current',
            'custom-a',
            '--shell',
            name
          );

          assert.sameMembers(
            parseProvideOutput(result.stdout),
            ['custom-alfa', 'custom-bravo'],
            `shell: ${name}`
          );
        }
      ],

      [
        `supports ${name} completions`,
        ({ testCompletions }) => {
          const flags = [
            '--count',
            '--custom',
            '--disabled',
            '--help',
            '--mode',
            '--no-enabled',
            '--title'
          ];

          return testCompletions(name, [
            [
              [' '],
              ['bare', 'completions', 'flags', 'group']
            ],
            [
              ['group', ' '],
              ['nested']
            ],
            [
              ['group', 'nested', ' '],
              flags
            ],
            [
              ['group', 'nested', '--c'],
              [
                '--count',
                '--custom'
              ]
            ],
            [
              ['group', 'nested', '--mode', ' '],
              ['mode-alfa', 'mode-bravo']
            ],
            [
              ['group', 'nested', '--mode='],
              ['mode-alfa', 'mode-bravo']
            ],
            [
              ['group', 'nested', '--disabled', ' '],
              flags
            ],
            [
              ['group', 'nested', '--count', '1', '--c'],
              ['--count', '--custom']
            ]
          ]);
        }
      ]
    ])
  )
});
