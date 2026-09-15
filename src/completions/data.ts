import { isSimpleScalarFlag } from '../flags/data.ts';
import type {
  ScalarFlag,
  ScalarValue,
  SimpleScalarFlag
} from '../flags/types.ts';
import type { Variant } from '../types/utils.ts';

/**
 * A strategy for completing a scalar flag's value
 */
export type ScalarValueCompletion =
  | Variant<'choice', { choices: readonly ScalarValue[] }>
  | Variant<'custom', { flag: SimpleScalarFlag }>
  | Variant<'files'>
  | Variant<'none'>;

/**
 * Determine how to complete a scalar flag's value
 */
export function scalarValueCompletion(
  flag: ScalarFlag
): ScalarValueCompletion {
  if (isSimpleScalarFlag(flag) && flag.completion) {
    return { type: 'custom', flag };
  } else if (flag.type === 'path') {
    return { type: 'files' };
  } else if (flag.type === 'choice') {
    return { type: 'choice', choices: [...flag.choices] };
  } else {
    return { type: 'none' };
  }
}
