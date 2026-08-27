/**
 * Produce the most inclusive type for an array
 */
export type AnyArray<T> = T[] | readonly T[];

/**
 * Remove a set of fields from all members of a union
 */
export type DistributiveOmit<
  T extends object,
  K extends keyof T
> = T extends unknown ? Omit<T, K> : never;

/**
 * Allow a value to be nulled out by a subset of falsy values
 */
export type Masked<T> = T | false | null | undefined;

/**
 * Accept a single item or a collection of items
 */
export type OneOrMany<T> = T | T[];

/**
 * Make a subset of fields in an object optional
 */
export type Optional<T extends object, K extends keyof T> =
  & Omit<T, K>
  & Partial<Pick<T, K>>;

/**
 * Require a subset of fields in an object
 */
export type Require<T extends object, K extends keyof T> =
  & Omit<T, K>
  & Required<Pick<T, K>>;

/**
 * Produce a narrower type from a subset of an object's properties
 */
export type Subset<T extends object, K extends keyof T> = Pick<T, K>;
