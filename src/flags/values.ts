import { quote } from '../shell.js';
import type { AnyArray, OneOrMany, Optional, Require } from '../types/utils.js';
import { flagToSetter } from './data.js';
import type {
  BooleanFlag,
  Flag,
  FlagContext,
  Flags,
  IsRequired,
  NumberFlag,
  PathFlag,
  ScalarFlag,
  StringFlag
} from './types.ts';

/**
 * The most inclusive value for all supported flags
 */
type SupportedValue = NonNullable<Flag['default']>;

/**
 * Flag fields that describe an implicit or explicit default value
 */
type DefaultFields = BooleanFlag | { default: SupportedValue };

/**
 * Flag fields that guarantee the presence of a value after parsing
 */
type GuaranteedFields = DefaultFields | IsRequired<Flag>;

/**
 * Extract the names of all flags that satisfy a constraint
 */
type NamesOf<T extends Flags, U> = Extract<
  { [K in keyof T]: T[K] extends U ? K : never }[keyof T],
  string
>;

/**
 * Determine the most specific value for a flag
 */
type GetValue<T extends Flag> = T extends BooleanFlag ? boolean
  : T extends NumberFlag ? number
  : T extends PathFlag ? string
  : T extends StringFlag
    ? T extends { choices: AnyArray<unknown> } ? T['choices'][number]
    : T extends { default: string } ? T['default']
    : T extends { isValid: (value: string) => value is infer U extends string }
      ? U
    : string
  : never;

/**
 * Determine the type associated with a flag's value
 */
export type ValueOf<
  TFlag extends Flag,
  TContext extends FlagContext = 'wide'
> = TFlag extends ScalarFlag
  ? TContext extends 'wide' ? OneOrMany<GetValue<TFlag>>
  : TFlag extends { allowMany: true } ? GetValue<TFlag>[]
  : GetValue<TFlag>
  : GetValue<TFlag>;

/**
 * Convert named flag specifications to values
 */
export type ValuesOf<
  TFlags extends Flags,
  TContext extends FlagContext = 'wide'
> = Require<
  { [K in keyof TFlags]?: ValueOf<TFlags[K], TContext> },
  NamesOf<TFlags, GuaranteedFields>
>;

/**
 * The most inclusive shape for flag values
 */
type FlagValues = Partial<
  Record<string, ValueOf<Flag, 'wide'>>
>;

/**
 * Determine the inputs to apply values to a set of flags
 */
type InputsFor<
  TFlags extends Flags,
  TValues extends FlagValues
> = Optional<TValues, NamesOf<TFlags, DefaultFields>>;

/**
 * Values that can be applied to a set of flags
 */
export type ApplicableValues<T extends Flags> = InputsFor<
  T,
  ValuesOf<T, 'narrow'>
>;

/**
 * An API for applying flag values via concrete data types
 */
type ValueProjector = {
  list: () => string[];
  string: () => string;
};

/**
 * A function that creates a projector to apply flag values
 */
type ValueProjectorFactory<T> = (values: T) => ValueProjector;

/**
 * An interface that can set full or partial values for flags
 */
type FlagValueSetter<T extends Flags> = {
  full: ValueProjectorFactory<ApplicableValues<T>>;
  partial: ValueProjectorFactory<Partial<ApplicableValues<T>>>;
};

/**
 * Create an interface to set flag values
 */
export function setFlagValues<T extends Flags>(flags: T): FlagValueSetter<T> {
  const project = (vs: ApplicableValues<Flags>): ValueProjector => ({
    list: () => applyValues(flags, vs),
    string: () => applyValues(flags, vs).map(quote).join(' ')
  });

  return {
    full: project,
    partial: project
  };
}

/**
 * Produce a list of CLI arguments to apply flag values via setters
 */
function applyValues(
  flags: Flags,
  values: ApplicableValues<Flags>
): string[] {
  return Object.keys(flags).sort().flatMap(name => {
    const flag = flags[name];
    const value = values[name];

    if (!flag || value === undefined) {
      return [];
    } else if (flag.type === 'boolean') {
      return [flagToSetter(value ? name : `no-${name}`)];
    }

    const items: unknown[] = Array.isArray(value) ? value : [value];

    return items.flatMap(item => [flagToSetter(name), String(item)]);
  });
}
