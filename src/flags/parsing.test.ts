import { assert, describe, it } from 'vitest';

import { NormalizedArgs } from '../args.js';
import C from '../factory.js';
import { checkConversion, ensure, inspect } from '../tests.js';
import type { DistributiveOmit } from '../types/utils.js';
import { useFlag, useFlags } from './definition.js';
import type { FlagParsing, ParsingOptions } from './parsing.js';
import { extractValues, getSharedFlagValue, parseFlags } from './parsing.js';
import { useSharedFlags } from './shared.js';
import type {
  Flags,
  ScalarValidator,
  ScalarValue,
  SimpleFlag,
  SimpleScalarFlag,
  SupportedValue
} from './types.js';

import os from 'node:os';
import path from 'node:path';

type ScalarType = SimpleScalarFlag['type'];
type SimpleFlagType = SimpleFlag['type'];

const description = 'description';
const scalarTypes: ScalarType[] = ['number', 'path', 'string'];

function parse(
  args: string[],
  flags: Flags,
  options?: ParsingOptions
) {
  return parseFlags(new NormalizedArgs(args), flags, options);
}

describe('extractValues', () => {
  it('extracts the values from a set of parsed flags', () => {
    const flags = useFlags({
      alfa: { description, type: 'string' },
      bravo: { description, type: 'number' }
    });

    const parsed = parse(['--alfa', '1', '--bravo', '2'], flags);

    assert.deepEqual(
      extractValues(parsed.flags),
      { alfa: '1', bravo: 2 }
    );
  });
});

describe('getSharedFlagValue', () => {
  it('gets the value of a shared flag', () => {
    const empty = parse([], useSharedFlags());
    const full = parse(['--help'], useSharedFlags());

    assert.isFalse(getSharedFlagValue(empty.flags, 'help'));
    assert.isTrue(getSharedFlagValue(full.flags, 'help'));
  });
});

describe('parseFlags', () => {
  function useWorkingDir<T>(absPath: string, useDir: () => T): T {
    const cwd = process.cwd();

    try {
      process.chdir(absPath);
      return useDir();
    } finally {
      process.chdir(cwd);
    }
  }

  function checkFlag<T extends string>(
    name: T,
    flag: DistributiveOmit<SimpleFlag, 'description'>,
    args: string[]
  ): FlagParsing<T> {
    return parse(args, {
      [name]: {
        ...flag,
        description: 'description'
      }
    });
  }

  it('can apply values to all supported flag types', () => {
    checkConversion<[SimpleFlagType, string[]], unknown>(
      ([type, args], value) => {
        const { flags } = useWorkingDir(
          '/',
          () => checkFlag('test', { type }, args)
        );

        assert.strictEqual(
          flags.test.value,
          value,
          `Unexpected value for ${type} flag for args: ${args.join(' ')}`
        );
      },
      [
        [['boolean', ['--test']], true],
        [['boolean', ['--no-test']], false],
        [['number', ['--test', '1']], 1],
        [['number', ['--test', '1.5']], 1.5],
        [['number', ['--test', '1e3']], 1000],
        [['number', ['--test', '2']], 2],
        [['path', ['--test', 'alfa']], '/alfa'],
        [['path', ['--test', '/bravo']], '/bravo'],
        [['string', ['--test', '1']], '1'],
        [['string', ['--test', '2']], '2']
      ]
    );
  });

  it('treats unset multi-value flags as undefined', () => {
    const flags = useFlags({
      alfa: {
        allowMany: true,
        description,
        type: 'string'
      },
      bravo: {
        allowMany: true,
        description,
        type: 'string'
      }
    });

    checkConversion<string[], object>(
      (args, value, message) => {
        assert.deepEqual(
          extractValues(parse(args, flags).flags),
          value,
          message
        );
      },
      [
        [[], {}],
        [['--alfa', 'test'], { alfa: ['test'] }],
        [['--bravo', 'test'], { bravo: ['test'] }],
        [
          ['--alfa', 'one', '--bravo', 'two'],
          {
            alfa: ['one'],
            bravo: ['two']
          }
        ]
      ]
    );
  });

  it('supports setting multiple values for flags', () => {
    checkConversion<[ScalarType, string[]], ScalarValue[]>(
      ([type, args], value) => {
        const { flags } = useWorkingDir(
          '/',
          () => checkFlag('test', { allowMany: true, type }, args)
        );

        assert.deepStrictEqual(
          flags.test.value as ScalarValue[],
          value,
          `Unexpected value for ${type} flag for args: ${args.join(' ')}`
        );
      },
      [
        [['number', ['--test=1']], [1]],
        [['number', ['--test', '1']], [1]],
        [
          ['number', ['--test=2', '--test=3']],
          [2, 3]
        ],
        [
          ['number', ['--test', '2', '--test', '3']],
          [2, 3]
        ],
        [['path', ['--test=alfa']], ['/alfa']],
        [['path', ['--test', 'alfa']], ['/alfa']],
        [
          ['path', ['--test=alfa', '--test=bravo']],
          ['/alfa', '/bravo']
        ],
        [
          ['path', ['--test', 'alfa', '--test', 'bravo']],
          ['/alfa', '/bravo']
        ],
        [['string', ['--test=1']], ['1']],
        [['string', ['--test', '1']], ['1']],
        [
          ['string', ['--test=2', '--test=3']],
          ['2', '3']
        ],
        [
          ['string', ['--test', '2', '--test', '3']],
          ['2', '3']
        ]
      ]
    );
  });

  it('handles flags with overlapping prefixes', () => {
    const flag = C.flag('string', description);

    const parsed = parse([
      '--alfa',
      '1',
      '--alfa-one',
      '2',
      '--alfa-two',
      '3'
    ], {
      alfa: flag,
      'alfa-one': flag,
      'alfa-two': flag
    });

    assert.deepEqual(
      extractValues(parsed.flags),
      { alfa: '1', 'alfa-one': '2', 'alfa-two': '3' }
    );
  });

  it('accepts flag-like strings as scalar values', () => {
    const parsed = parse(['--a', '--a', '--a', ''], {
      a: C.flag('string', description, { allowMany: true })
    });

    assert.deepEqual(extractValues(parsed.flags), { a: ['--a', ''] });
  });

  it('consumes setter-like values before other flags can claim them', () => {
    const flag = C.flag('string', description);
    const flags = { alfa: flag, bravo: flag };

    const parsed = parse(['--alfa', '--bravo', '2'], flags, {
      allowUnused: true
    });

    assert.deepEqual(extractValues(parsed.flags), { alfa: '--bravo' });
    assert.deepEqual(parsed.args.extra, ['2']);
  });

  it('throws an error for values left after a setter-like value is consumed', () => {
    ensure.throws(
      () =>
        parse(['--alfa', '--bravo', '2'], {
          alfa: C.flag('string', description),
          bravo: C.flag('string', description)
        }),
      'Unused argument: 2'
    );
  });

  it('supports interleaved multi-value flags', () => {
    const parsed = parse(['--alfa', '1', '--bravo', '2', '--alfa', '3'], {
      alfa: C.flag('number', description, { allowMany: true }),
      bravo: C.flag('number', description)
    });

    assert.deepEqual(extractValues(parsed.flags), {
      alfa: [1, 3],
      bravo: 2
    });
  });

  it('throws an error if multiple values are provided without restating the flag name', () => {
    const cases: Array<[ScalarType, string[]]> = [
      ['number', ['--test', '2', '3']],
      ['path', ['--test', 'alfa', 'bravo']],
      ['string', ['--test', '2', '3']]
    ];

    cases.forEach(([type, args]) => {
      ensure.throws(
        () => checkFlag('test', { allowMany: true, type }, args),
        'Unused argument',
        `Multiple values allowed ${type} flag`
      );
    });
  });

  it('supports equal-sign bindings for flags', () => {
    checkConversion<[ScalarType, string], unknown>(
      ([type, arg], parsed) => {
        const { flags } = useWorkingDir(
          '/',
          () => checkFlag('test', { type }, [arg])
        );

        assert.strictEqual(
          flags.test.value,
          parsed,
          `Unexpected value for ${type} flag for args: ${arg}`
        );
      },
      [
        [['number', '--test=1'], 1],
        [['number', '--test=2'], 2],
        [['number', '--test="3"'], 3],
        [['path', '--test=alfa'], '/alfa'],
        [['path', '--test=bravo'], '/bravo'],
        [['path', '--test="alfa"'], '/alfa'],
        [['path', '--test="alfa bravo"'], '/alfa bravo'],
        [['string', '--test=1'], '1'],
        [['string', '--test=2'], '2'],
        [['string', '--test="3"'], '3'],
        [['string', '--test="3 4"'], '3 4']
      ]
    );
  });

  it('can apply default values to all supported types', () => {
    checkConversion<[SimpleFlagType, SupportedValue], SupportedValue>(
      ([type, value], parsed) => {
        const { flags } = checkFlag(
          'test',
          { default: value, type } as SimpleFlag,
          []
        );

        assert.strictEqual(
          flags.test.value,
          parsed,
          `Default value for ${type} flag not applied: ${inspect(value)}`
        );
      },
      [
        [['boolean', true], true],
        [['boolean', false], false],
        [['number', 0], 0],
        [['number', 1], 1],
        [['number', 2], 2],
        [['path', '1'], '1'],
        [['path', '2'], '2'],
        [['string', '1'], '1'],
        [['string', '2'], '2']
      ]
    );
  });

  it('allows flags to override their default values', () => {
    checkConversion<
      [SimpleFlagType, SupportedValue, string[]],
      SupportedValue
    >(
      ([type, value, args], parsed) => {
        const { flags } = useWorkingDir(
          '/',
          () => checkFlag('test', { default: value, type } as SimpleFlag, args)
        );

        assert.strictEqual(
          flags.test.value,
          parsed,
          `Default value for ${type} flag not overridden: ${inspect(value)}`
        );
      },
      [
        [['boolean', true, ['--no-test']], false],
        [['number', 1, ['--test', '2']], 2],
        [['path', 'alfa', ['--test', 'bravo']], '/bravo'],
        [['string', '1', ['--test', '2']], '2']
      ]
    );
  });

  it('throws an error if a required flag lacks a value', () => {
    scalarTypes.forEach((type) => {
      const message = `Missing value allowed for ${type} flag`;

      ensure.throws(
        () => checkFlag('test', { required: true, type }, []),
        error => {
          assert.equal(
            error.message,
            'Missing value for required flag: test',
            message
          );
        },
        message
      );
    });
  });

  it('throws an error if a required multi-value flag lacks a value', () => {
    scalarTypes.forEach((type) => {
      const message = `Missing value allowed for ${type} flag`;

      ensure.throws(
        () =>
          checkFlag(
            'test',
            {
              allowMany: true,
              required: true,
              type
            },
            []
          ),
        error => {
          assert.equal(
            error.message,
            'Missing value for required flag: test',
            message
          );
        },
        message
      );
    });
  });

  it('allows defaults to provide values for missing required flags', () => {
    checkConversion<[SimpleFlagType, SupportedValue], SupportedValue>(
      ([type, value], output) => {
        const { flags } = checkFlag(
          'test',
          { default: value, required: true, type } as SimpleFlag,
          []
        );

        assert.strictEqual(
          flags.test.value,
          output,
          `Default value for ${type} flag not applied: ${inspect(value)}`
        );
      },
      [
        [['boolean', true], true],
        [['number', 1], 1],
        [['path', '1'], '1'],
        [['string', '1'], '1']
      ]
    );
  });

  it('expands all paths', () => {
    checkConversion<string, string>(
      (arg, parsed, message) => {
        const { flags } = useWorkingDir(
          '/',
          () => checkFlag('test', { type: 'path' }, ['--test', arg])
        );

        assert.strictEqual(flags.test.value, parsed, message);
      },
      [
        ['/tmp', '/tmp'],
        ['/tmp/../var', '/var'],
        ['tmp', '/tmp'],
        ['~/bin', path.join(os.homedir(), 'bin')]
      ]
    );
  });

  it('throws an error if a scalar flag lacks a value', () => {
    scalarTypes.forEach(type => {
      ensure.throws(
        () => checkFlag('alfa', { type }, ['--alfa']),
        'Missing value for flag: alfa',
        `Incomplete value allowed for ${type} flag`
      );
    });
  });

  it('uses the next argument as a scalar value even when it looks like a setter', () => {
    const parsed = parse(['--alfa', '--bravo'], {
      alfa: C.flag('string', description),
      bravo: C.flag('boolean', description)
    });

    assert.deepEqual(extractValues(parsed.flags), {
      alfa: '--bravo',
      bravo: false
    });
  });

  it('throws an error if a flag-like scalar value is not valid for the flag type', () => {
    ensure.throws(
      () =>
        parse(['--alfa', '--bravo'], {
          alfa: C.flag('number', description),
          bravo: C.flag('boolean', description)
        }),
      'Invalid number: --bravo'
    );
  });

  it('throws an error if an unknown flag is provided', () => {
    const cases: Array<string[]> = [
      ['--invalid'],
      ['--valid', 'value', '--invalid']
    ];

    cases.forEach((args) => {
      ensure.throws(
        () =>
          parse(args, {
            valid: {
              description,
              type: 'string'
            }
          }),
        'Unknown flag: --invalid',
        `Invalid flag allowed with args: ${args.join(' ')}`
      );
    });
  });

  it('throws an error if extra flag values are provided', () => {
    const cases: Array<string[]> = [
      ['--value', 'alfa', 'charlie'],
      ['--value', 'bravo', 'charlie']
    ];

    cases.forEach((args) => {
      ensure.throws(
        () =>
          parse(args, {
            value: {
              description,
              type: 'string'
            }
          }),
        'Unused argument: charlie',
        `Invalid argument allowed with args: ${args.join(' ')}`
      );
    });
  });

  it('can allow unknown flags', () => {
    const cases: Array<[string[], Record<string, SupportedValue>]> = [
      [['--alfa'], { boolean: false }],
      [['--alfa', '--bravo'], { boolean: false }],
      [['--alfa', '--bravo', '--boolean'], { boolean: true }],
      [
        ['--alfa', '--bravo', '--boolean', '--string', 'value'],
        { boolean: true, string: 'value' }
      ]
    ];

    cases.forEach(([args, values]) => {
      const parsed = parse(
        args,
        {
          boolean: { description, type: 'boolean' },
          string: { description, type: 'string' }
        },
        { allowUnused: true }
      );

      assert.deepEqual(
        extractValues(parsed.flags),
        values,
        `Unexpected parsed flags for args: ${args.join(' ')}`
      );

      assert.sameOrderedMembers(
        parsed.args.all,
        args,
        `Incorrect arguments reported for input args: ${args.join(' ')}`
      );
    });
  });

  it('validates known flags when allowing unknown flags', () => {
    const cases: Array<string[]> = [
      [],
      ['--required'],
      ['--optional'],
      ['--other'],
      ['--other', '--required'],
      ['--other', '--optional']
    ];

    cases.forEach((args) => {
      ensure.throws(
        () =>
          parse(
            args,
            {
              optional: { description, type: 'string' },
              required: { description, required: true, type: 'string' }
            },
            { allowUnused: true }
          ),
        'Missing value',
        `Failed to run validation against args: ${args.join(' ')}`
      );
    });
  });

  it('throws an error if multiple values are provided for a flag', () => {
    const cases: Record<SimpleFlagType, string[]> = {
      boolean: ['--no-test', '--test'],
      number: ['--test', '1', '--test', '2'],
      path: ['--test', '1', '--test', '2'],
      string: ['--test', '1', '--test', '2']
    };

    Object.entries(cases).forEach(([type, args]) => {
      ensure.throws(
        () => checkFlag('test', { type: type as SimpleFlagType }, args),
        'Multiple values provided for flag: test',
        `Multiple values allowed for ${type} flag`
      );
    });
  });

  it('throws an error if a value is not in the set of choices', () => {
    const cases: Array<[
      ScalarValue[],
      ScalarValue,
      ScalarValue
    ]> = [
      [['1', '2'], '1', '3'],
      [[1, 2], 1, 3]
    ];

    cases.forEach(([choices, valid, invalid]) => {
      const flag = useFlag({
        choices,
        description,
        type: 'choice'
      });

      ensure.throws(
        () => parse(['--test', invalid.toString()], { test: flag }),
        'Invalid value',
        `Invalid value ${invalid} allowed: ${choices}`
      );

      assert.isDefined(
        parse(['--test', valid.toString()], { test: flag }).flags.test,
        `Valid choice ${valid} rejected: ${choices}`
      );
    });
  });

  it('throws an error if a a default value is invalid for a choice flag', () => {
    const cases: Array<[
      ScalarValue[],
      ScalarValue
    ]> = [
      [['1', '2'], '3'],
      [[1, 2], 3]
    ];

    cases.forEach(([choices, invalid]) => {
      const flag = useFlag({
        choices,
        default: invalid,
        description,
        type: 'choice'
      });

      ensure.throws(
        () => parse([], { test: flag }),
        'Invalid value',
        `Invalid default choice ${invalid} allowed: ${choices}`
      );
    });
  });

  it('throws an error if a validator function returns false', () => {
    const cases: Array<
      [
        ScalarType,
        ScalarValidator<ScalarValue>,
        string,
        string
      ]
    > = [
      ['number', v => v === 1, '1', '2'],
      ['path', v => v === '/alfa', '/alfa', '/bravo'],
      ['string', v => v === '1', '1', '2']
    ];

    cases.forEach(([type, isValid, valid, invalid]) => {
      ensure.throws(
        () => checkFlag('test', { isValid, type }, ['--test', invalid]),
        'Unsupported value',
        `An invalid ${type} value was allowed`
      );

      assert.isDefined(
        checkFlag('test', { isValid, type }, ['--test', valid]).flags.test,
        `A valid ${type} value was rejected`
      );
    });
  });

  it('uses a validator function’s string result as the error message', () => {
    ensure.throws(
      () =>
        checkFlag(
          'test',
          {
            isValid: () => '@alfa',
            type: 'string'
          },
          ['--test', 'bravo']
        ),
      '@alfa'
    );
  });

  it('throws an error if an invalid value type is provided for a flag', () => {
    const cases: Array<[ScalarType, string[]]> = [
      ['number', ['--test', '']],
      ['number', ['--test', 'test']]
    ];

    cases.forEach(([type, args]) => {
      ensure.throws(
        () => checkFlag('test', { type }, args),
        'Invalid value',
        `Invalid value allowed for ${type} flag with args: ${args.join(' ')}`
      );
    });
  });

  it('includes a flag’s invalid value in its error message', () => {
    const cases: Array<[ScalarType, string[]]> = [
      ['number', ['--test', 'alfa']],
      ['number', ['--test', 'bravo']]
    ];

    cases.forEach(([type, args]) => {
      ensure.throws(
        () => checkFlag('test', { type }, args),
        args.join(' '),
        `Invalid value not shown for ${type} flag with args: ${args.join(' ')}`
      );
    });
  });
});
