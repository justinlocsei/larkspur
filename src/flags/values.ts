import type { OneOrMany, Require } from '../types/utils.ts';
import type {
  BooleanFlag,
  ChoiceFlag,
  Flag,
  FlagContext,
  Flags,
  IsRequired,
  NumberFlag,
  PathFlag,
  ScalarFlag,
  StringFlag,
  SupportedValue
} from './types.ts';

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
export type SpecificValueOf<T extends Flag> = T extends BooleanFlag ? boolean
  : T extends ChoiceFlag<infer C> ? C[number]
  : T extends NumberFlag ? number
  : T extends PathFlag ? string
  : T extends StringFlag ? string
  : never;

/**
 * Determine the type associated with a flag's value
 */
export type ValueOf<
  TFlag extends Flag,
  TContext extends FlagContext = 'wide'
> = TFlag extends ScalarFlag
  ? TContext extends 'wide' ? OneOrMany<SpecificValueOf<TFlag>>
  : TFlag extends { allowMany: true } ? SpecificValueOf<TFlag>[]
  : SpecificValueOf<TFlag>
  : SpecificValueOf<TFlag>;

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
