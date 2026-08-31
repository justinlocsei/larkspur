/**
 * Core fields shared by all flags
 */
type CoreFlagFields<T extends string> = {
  description: string;
  type: T;
};

/**
 * Optional fields shared by all flags
 */
type OptionalFlagFields<T> = {
  default?: T;
};

/**
 * Define a flag
 */
type IsFlag<TType extends string, TValue> =
  & CoreFlagFields<TType>
  & OptionalFlagFields<TValue>;

/**
 * Shared fields for all scalar flags
 */
type ScalarFields = {
  allowMany?: boolean;
  completion?: string;
  required?: true;
};

/**
 * Options for simple scalar flags
 */
export type SimpleScalarOptions<T extends ScalarValue> = ScalarFields & {
  default?: T;
  isValid?: ScalarValidator<T>;
};

/**
 * Define a simple scalar flag
 */
type IsSimpleScalarFlag<T extends string, V extends ScalarValue> =
  & IsFlag<T, V>
  & SimpleScalarOptions<V>;

/**
 * A function that determines whether a scalar value is valid
 */
export type ScalarValidator<T extends ScalarValue> = (
  value: T
) => boolean | string;

/**
 * A boolean flag
 */
export type BooleanFlag = IsFlag<'boolean', boolean>;

/**
 * A numeric flag
 */
export type NumberFlag = IsSimpleScalarFlag<'number', number>;

/**
 * A flag that takes a filesystem path
 */
export type PathFlag = IsSimpleScalarFlag<'path', string>;

/**
 * A string flag
 */
export type StringFlag = IsSimpleScalarFlag<'string', string>;

/**
 * A flag constrained to a limited set of scalar values
 */
export type ChoiceFlag<
  C extends readonly ScalarValue[] = readonly ScalarValue[]
> =
  & IsFlag<'choice', C[number]>
  & ScalarFields
  & { choices: C };

/**
 * Get the values for a choice flag
 */
export type ChoicesFor<T extends ChoiceFlag> = T['choices'][number];

/**
 * A simple scalar flag
 */
export type SimpleScalarFlag = NumberFlag | PathFlag | StringFlag;

/**
 * The flags that take a scalar value
 */
export type ScalarFlag = ChoiceFlag | SimpleScalarFlag;

/**
 * All possible CLI flags
 */
export type Flag = BooleanFlag | ScalarFlag;

/**
 * Flags that accept simple values
 */
export type SimpleFlag = BooleanFlag | SimpleScalarFlag;

/**
 * Get the flag with a given type
 */
export type FlagOfType<T extends Flag['type']> = Extract<Flag, { type: T }>;

/**
 * Mark a flag as required
 */
export type IsRequired<T extends Flag> = T & { required: true };

/**
 * A value for a scalar flag
 */
export type ScalarValue = number | string;

/**
 * The most inclusive value for all supported flags
 */
export type SupportedValue = NonNullable<Flag['default']>;

/**
 * Extracted choices for a flag
 */
export type FlagChoices = readonly ScalarValue[] | undefined;

/**
 * Extract options from a flag
 */
export type FlagOptions<T extends Flag> = Omit<
  T,
  keyof CoreFlagFields<T['type']>
>;

/**
 * The context in which a flag's value is being used
 *
 * This is used to distinguish between internal code that must account for every
 * possible value of a flag and user code that defines a CLI command, which
 * should know about the specific value of its flags.
 */
export type FlagContext = 'narrow' | 'wide';

/**
 * Definitions for a set of named CLI flags
 */
export type Flags<T extends string = string> = Record<T, Flag>;

/**
 * Details on how flags were parsed
 */
export type ConsumedArgs = {
  all: string[];
  extra: string[];
  parsed: string[];
};
