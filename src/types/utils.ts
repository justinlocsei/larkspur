/**
 * Recursively make an object partial
 */
export type DeepPartial<T extends object> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Remove a set of fields from all members of a union
 */
export type DistributiveOmit<
  T extends object,
  K extends keyof T
> = T extends unknown ? Omit<T, K> : never;

/**
 * Distribute a readonly modifier to all values
 */
export type DistributiveReadonly<T> = T extends T ? readonly T[] : never;

/**
 * Require a provided object to match a schema
 */
export type Exact<Schema, Provided> =
  & Schema
  & Provided
  & { [K in Exclude<keyof Provided, keyof Schema>]?: never };

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
