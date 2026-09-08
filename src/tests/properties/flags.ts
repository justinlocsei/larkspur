import { fc } from '@fast-check/vitest';

import C from '../../factory.ts';
import type {
  BooleanFlag,
  ChoiceFlag,
  NumberFlag,
  PathFlag,
  StringFlag
} from '../../flags/types.ts';
import { description, flagName } from './definition.ts';

/**
 * Options for defining a flag arbitrary
 */
export type FlagOptions = {
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

/**
 * Apply a repeatable default value as an array
 */
function repeatableDefault<T>(
  allowMany: boolean | undefined,
  defaultValue: T | undefined
): T | T[] | undefined {
  return allowMany && defaultValue !== undefined
    ? [defaultValue]
    : defaultValue;
}

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
          default: useDefault
            ? allowMany ? choices : choices[0]
            : undefined,
          required
        })
    );

const numberFlag = (options: FlagOptions) =>
  scalarOptions(fc.integer(), options).map(
    ({ allowMany, default: defaultValue, description, required }): NumberFlag =>
      C.flag('number', description, {
        allowMany,
        default: repeatableDefault(allowMany, defaultValue),
        required
      })
  );

const pathFlag = (options: FlagOptions) =>
  scalarOptions(fc.string(), options).map(
    ({ allowMany, default: defaultValue, description, required }): PathFlag =>
      C.flag('path', description, {
        allowMany,
        default: repeatableDefault(allowMany, defaultValue),
        required
      })
  );

const stringFlag = (options: FlagOptions) =>
  scalarOptions(fc.string(), options).map(
    ({ allowMany, default: defaultValue, description, required }): StringFlag =>
      C.flag('string', description, {
        allowMany,
        default: repeatableDefault(allowMany, defaultValue),
        required
      })
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
    {
      minLength: 0,
      selector: ([name]) => name
    }
  ).map(entries => Object.fromEntries(entries));
