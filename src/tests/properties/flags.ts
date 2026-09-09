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
    default: optional(defaultValue),
    description,
    repeatable: fc.oneof(fc.constant(true), fc.constant(undefined)),
    required: required
      ? fc.oneof(fc.constant(true), fc.constant(undefined))
      : fc.constant(undefined)
  });

/**
 * Apply a repeatable default value as an array
 */
function repeatableDefault<T>(
  repeatable: true | undefined,
  defaultValue: T | undefined
): T | T[] | undefined {
  return repeatable === true && defaultValue !== undefined
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
        [{ description, repeatable, required }, choices, useDefault]
      ): ChoiceFlag =>
        C.flag('choice', description, {
          choices,
          default: useDefault
            ? repeatable ? choices : choices[0]
            : undefined,
          repeatable,
          required
        })
    );

const numberFlag = (options: FlagOptions) =>
  scalarOptions(fc.integer(), options).map(
    (
      { default: defaultValue, description, repeatable, required }
    ): NumberFlag =>
      C.flag('number', description, {
        default: repeatableDefault(repeatable, defaultValue),
        repeatable,
        required
      })
  );

const pathFlag = (options: FlagOptions) =>
  scalarOptions(fc.string(), options).map(
    ({ default: defaultValue, description, repeatable, required }): PathFlag =>
      C.flag('path', description, {
        default: repeatableDefault(repeatable, defaultValue),
        repeatable,
        required
      })
  );

const stringFlag = (options: FlagOptions) =>
  scalarOptions(fc.string(), options).map(
    (
      { default: defaultValue, description, repeatable, required }
    ): StringFlag =>
      C.flag('string', description, {
        default: repeatableDefault(repeatable, defaultValue),
        repeatable,
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
