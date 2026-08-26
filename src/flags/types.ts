import type { AnyArray } from '../types/utils.js';

/**
 * Define a flag
 */
type IsFlag<TType extends string, TValue> = {
  default?: TValue;
  description: string;
  type: TType;
};

/**
 * Define a flag that takes a scalar value
 */
type IsScalarFlag<
  TGeneric extends ScalarValue = ScalarValue,
  TSpecific extends TGeneric = TGeneric
> = {
  allowMany?: boolean;
  completionScript?: string;
  isValid?: ScalarValidator<TGeneric, TSpecific>;
  required?: boolean;
};

/**
 * A function that returns whether a scalar value is valid or is a subtype of a
 * parent type
 */
export type ScalarValidator<T extends ScalarValue, U extends T> =
  | ((value: T) => value is U)
  | ((value: T) => boolean);

/**
 * A boolean flag
 */
export type BooleanFlag = IsFlag<'boolean', boolean>;

/**
 * A numeric flag
 */
export type NumberFlag =
  & IsFlag<'number', number>
  & IsScalarFlag<number, number>;

/**
 * A flag that takes a filesystem path
 */
export type PathFlag = IsFlag<'path', string> & IsScalarFlag<string, string>;

/**
 * A string flag
 */
export type StringFlag<T extends string = string> =
  & IsFlag<'string', T>
  & IsScalarFlag<string, T>
  & { choices?: AnyArray<T> };

/**
 * The flags that take a scalar value
 */
export type ScalarFlag =
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
export type FlagChoices = undefined | string[];

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
