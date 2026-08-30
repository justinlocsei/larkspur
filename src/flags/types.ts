/**
 * Define a flag
 */
type IsFlag<TType extends string, TValue> = {
  default?: TValue;
  description: string;
  type: TType;
};

/**
 * Shared fields for all scalar flags
 */
type ScalarFields = {
  allowMany?: boolean;
  completion?: string;
  required?: true;
};

/**
 * Define a basic scalar flag
 */
type IsScalarFlag<T extends string, V extends ScalarValue> =
  & IsFlag<T, V>
  & ScalarFields
  & { isValid?: ScalarValidator<V> };

/**
 * A function that determines whether a scalar value is valid
 */
export type ScalarValidator<T extends ScalarValue> = (value: T) => boolean;

/**
 * A boolean flag
 */
export type BooleanFlag = IsFlag<'boolean', boolean>;

/**
 * A numeric flag
 */
export type NumberFlag = IsScalarFlag<'number', number>;

/**
 * A flag that takes a filesystem path
 */
export type PathFlag = IsScalarFlag<'path', string>;

/**
 * A string flag
 */
export type StringFlag = IsScalarFlag<'string', string>;

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
 * The flags that take a scalar value
 */
export type ScalarFlag =
  | ChoiceFlag
  | NumberFlag
  | PathFlag
  | StringFlag;

/**
 * All possible CLI flags
 */
export type Flag = BooleanFlag | ScalarFlag;

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
