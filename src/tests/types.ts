/**
 * Report whether a given type is the never type
 */
export type Never<T> = [T] extends [never] ? true : false;

/**
 * Report whether a given type is not the never type
 */
export type NonNever<T> = [T] extends [never] ? false : true;

/**
 * Report whether two types are equivalent
 */
export type Equivalent<Left, Right> = Exclude<Left, Right> extends
  Exclude<Right, Left>
  ? Exclude<Right, Left> extends Exclude<Left, Right> ? true : never
  : never;

/**
 * Assert that a type matches the given boolean value
 */
export function assert<T extends boolean>(
  isTrue: NonNever<T>,
  message = 'Incompatible types'
): string | undefined {
  return isTrue ? message : undefined;
}
