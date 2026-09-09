import { isSimpleScalarFlag } from '../flags/data.ts';
import type { ScalarFlag } from '../flags/types.ts';

/**
 * An internal ID for a scalar completion type
 */
export type ScalarValueCompletion = 'choice' | 'custom' | 'files' | 'none';

/**
 * Determine how to complete a scalar flag's value
 */
export function scalarValueCompletion(
  flag: ScalarFlag
): ScalarValueCompletion {
  if (isSimpleScalarFlag(flag) && flag.completion) {
    return 'custom';
  } else if (flag.type === 'path') {
    return 'files';
  } else if (flag.type === 'choice') {
    return 'choice';
  } else {
    return 'none';
  }
}
