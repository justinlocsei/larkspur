import { fc } from '@fast-check/vitest';

import C from '../../factory.js';
import type {
  BooleanFlag,
  ChoiceFlag,
  NumberFlag,
  PathFlag,
  StringFlag
} from '../../flags/types.js';
import { flagName } from './definition.js';

const optional = <T>(a: fc.Arbitrary<T>) => fc.option(a, { nil: undefined });
const optionalBoolean = optional(fc.boolean());

const scalarOptions = <T>(defaultValue: fc.Arbitrary<T>) =>
  fc.record({
    allowMany: optionalBoolean,
    default: optional(defaultValue),
    description: fc.string(),
    required: fc.oneof(fc.constant(true), fc.constant(undefined))
  });

const booleanFlag = fc.tuple(fc.string(), optionalBoolean).map((
  [description, value]
): BooleanFlag => C.flag('boolean', description, { default: value }));

const choiceFlag = fc.tuple(
  scalarOptions(fc.string()),
  fc.array(fc.string(), { minLength: 1 }),
  fc.boolean()
)
  .map(
    ([{ allowMany, description, required }, choices, useDefault]): ChoiceFlag =>
      C.flag('choice', description, {
        allowMany,
        choices,
        default: useDefault ? choices[0] : undefined,
        required
      })
  );

const numberFlag = scalarOptions(fc.integer()).map(
  ({ description, ...options }): NumberFlag =>
    C.flag('number', description, options)
);

const pathFlag = scalarOptions(fc.string()).map(
  ({ description, ...options }): PathFlag =>
    C.flag('path', description, options)
);

const stringFlag = scalarOptions(fc.string()).map(
  ({ description, ...options }): StringFlag =>
    C.flag('string', description, options)
);

export const flag = fc.oneof(
  booleanFlag,
  choiceFlag,
  numberFlag,
  pathFlag,
  stringFlag
);

export const flags = fc.uniqueArray(
  fc.tuple(flagName, flag),
  { minLength: 0 }
).map(entries => Object.fromEntries(entries));
