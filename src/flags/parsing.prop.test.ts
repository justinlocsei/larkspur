import { fc, test } from '@fast-check/vitest';
import { assert } from 'vitest';

import { NormalizedArgs } from '../args.ts';
import C from '../factory.ts';
import { flagName } from '../tests/properties.ts';
import type { FlagParsing } from './parsing.ts';
import { parseFlags } from './parsing.ts';

const description = 'description';

function checkScalarParsing(
  parsed: FlagParsing,
  flag: string,
  checkValue: (value: unknown) => void
) {
  assert.deepEqual(parsed.provided, [flag], 'incorrect provided flags');

  assert.deepEqual(Object.keys(parsed.flags), [flag], 'incorrect flags');

  const value = parsed.flags[flag]?.value;
  assert.isDefined(value, 'no flag value');

  checkValue(value);
}

test.prop([flagName, fc.string()])(
  'string flags accept arbitrary input',
  (flag, value) => {
    const parsed = parseFlags(
      new NormalizedArgs([`--${flag}`, value]),
      { [flag]: C.flag('string', description) }
    );

    checkScalarParsing(parsed, flag, v => {
      assert(typeof v === 'string');
      assert.equal(v, value);
    });
  }
);

test.prop([flagName, fc.integer()])(
  'number flags accept arbitrary input',
  (flag, value) => {
    const parsed = parseFlags(
      new NormalizedArgs([`--${flag}`, value.toString()]),
      { [flag]: C.flag('number', description) }
    );

    checkScalarParsing(parsed, flag, v => {
      assert(typeof v === 'number');
      assert.equal(v, value);
    });
  }
);

test.prop([flagName, fc.string()])(
  'choice flags accept arbitrary input',
  (flag, value) => {
    const parsed = parseFlags(
      new NormalizedArgs([`--${flag}`, value]),
      { [flag]: C.flag('choice', description, { choices: [value] }) }
    );

    checkScalarParsing(parsed, flag, v => {
      assert(typeof v === 'string');
      assert.equal(v, value);
    });
  }
);

test.prop([flagName, fc.array(fc.string(), { minLength: 2 })])(
  'flags support multiple values when allowed',
  (flag, values) => {
    const parsed = parseFlags(
      new NormalizedArgs(values.flatMap(v => [`--${flag}`, v])),
      { [flag]: C.flag('string', description, { repeatable: true }) }
    );

    checkScalarParsing(parsed, flag, v => {
      assert.deepEqual(v, values);
    });
  }
);

test.prop([
  fc.uniqueArray(flagName, { minLength: 2, maxLength: 200 })
])(
  'large flag sets are supported',
  names => {
    const flags = Object.fromEntries(
      names.map(name => [name, C.flag('string', description)])
    );

    const args = names.flatMap(n => [`--${n}`, n]);
    const result = parseFlags(new NormalizedArgs(args), flags);

    assert.sameMembers(Object.keys(result.flags), names);
  }
);
