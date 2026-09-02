import { fc, test } from '@fast-check/vitest';
import { assert } from 'vitest';

import { NormalizedArgs } from '../args.js';
import C from '../factory.js';
import { flagName } from '../tests/properties.js';
import type { FlagParsing } from './parsing.js';
import { parseFlags } from './parsing.js';

const description = 'description';

function checkScalarParsing(
  parsed: FlagParsing,
  flag: string,
  checkValue: (value: unknown) => void
) {
  assert.deepEqual(parsed.provided, [flag], 'incorrect provided flags');

  assert.deepEqual(
    parsed.args.all,
    parsed.args.parsed,
    'inconsistent parsing results'
  );

  assert.isEmpty(parsed.args.extra, 'unexpected extra arguments');

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
      { [flag]: C.flag('string', description, { allowMany: true }) }
    );

    checkScalarParsing(parsed, flag, v => {
      assert(Array.isArray(v));
      assert.equal(v.length, values.length);
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
