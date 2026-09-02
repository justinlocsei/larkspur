import { fc } from '@fast-check/vitest';

import C from '../../factory.js';
import type {
  BooleanFlag,
  ChoiceFlag,
  NumberFlag,
  PathFlag,
  StringFlag
} from '../../flags/types.js';
import { description, flagName } from './definition.js';

/**
 * Options for defining a flag arbitrary
 */
type FlagOptions = {
  required?: boolean;
};

const optional = <T>(a: fc.Arbitrary<T>) => fc.option(a, { nil: undefined });
const optionalBoolean = optional(fc.boolean());

const scalarOptions = <T>(
  defaultValue: fc.Arbitrary<T>,
  { required = true }: FlagOptions
) =>
  fc.record({
    allowMany: optionalBoolean,
    default: optional(defaultValue),
    description,
    required: required
      ? fc.oneof(fc.constant(true), fc.constant(undefined))
      : fc.constant(undefined)
  });

const booleanFlag = fc.tuple(fc.string(), optionalBoolean).map((
  [description, value]
): BooleanFlag => C.flag('boolean', description, { default: value }));

const choiceFlag = (options: FlagOptions) =>
  fc.tuple(
    scalarOptions(fc.string(), options),
    fc.array(fc.string(), { minLength: 1 }),
    fc.boolean()
  )
    .map(
      (
        [{ allowMany, description, required }, choices, useDefault]
      ): ChoiceFlag =>
        C.flag('choice', description, {
          allowMany,
          choices,
          default: useDefault ? choices[0] : undefined,
          required
        })
    );

const numberFlag = (options: FlagOptions) =>
  scalarOptions(fc.integer(), options).map(
    ({ description, ...options }): NumberFlag =>
      C.flag('number', description, options)
  );

const pathFlag = (options: FlagOptions) =>
  scalarOptions(fc.string(), options).map(
    ({ description, ...options }): PathFlag =>
      C.flag('path', description, options)
  );

const stringFlag = (options: FlagOptions) =>
  scalarOptions(fc.string(), options).map(
    ({ description, ...options }): StringFlag =>
      C.flag('string', description, options)
  );

const flag = (options: FlagOptions) =>
  fc.oneof(
    booleanFlag,
    choiceFlag(options),
    numberFlag(options),
    pathFlag(options),
    stringFlag(options)
  );

export const flags = (options: FlagOptions) =>
  fc.uniqueArray(
    fc.tuple(flagName, flag(options)),
    { minLength: 0 }
  ).map(entries => Object.fromEntries(entries));
