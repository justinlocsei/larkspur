/**
 * Transform the values of an object by a given function
 */
export function transformValues<
  TInput extends Record<string, unknown>,
  TMapped extends { [P in keyof TInput]: TOutput },
  TOutput
>(
  input: TInput,
  transform: (
    value: NonNullable<TInput[keyof TInput]>,
    key: keyof TInput
  ) => TOutput
): TMapped {
  const mapped: Partial<{ [P in keyof TInput]: TOutput }> = {};
  const keys = Object.keys(input) as Array<keyof TInput>;

  keys.forEach((key) => {
    const value = input[key];

    if (value !== null && value !== undefined) {
      mapped[key] = transform(value, key);
    }
  });

  return mapped as TMapped;
}
