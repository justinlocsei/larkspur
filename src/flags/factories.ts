import type { DistributiveReadonly, Exact } from '../types/utils.ts';
import type {
  BooleanFlag,
  ChoiceFlag,
  Flag,
  FlagOfType,
  FlagOptions,
  NumberFlag,
  PathFlag,
  ScalarValue,
  SimpleFlag,
  StringFlag
} from './types.ts';

/**
 * Constrain provided options to a flag's known options
 */
type ValidOptions<T extends Flag, O> =
  & Exact<FlagOptions<T>, O>
  & ValidDefaultOptions<O>;

/**
 * Require value lists for defaults of multi-value flags
 */
type ValidDefaultOptions<O> =
  O extends { default: readonly unknown[] }
    ? O extends { allowMany: true } ? O : never
    : O;

/**
 * Build a command flag
 */
export function buildFlag<T extends SimpleFlag['type']>(
  type: T,
  description: string
): FlagOfType<T>;
export function buildFlag<O>(
  type: 'boolean',
  description: string,
  options: ValidOptions<BooleanFlag, O>
): BooleanFlag & NoInfer<O>;
export function buildFlag<const C extends DistributiveReadonly<ScalarValue>, O>(
  type: 'choice',
  description: string,
  options: ValidOptions<ChoiceFlag<C>, O>
): ChoiceFlag<C> & NoInfer<O>;
export function buildFlag<O>(
  type: 'number',
  description: string,
  options: ValidOptions<NumberFlag, O>
): NumberFlag & NoInfer<O>;
export function buildFlag<O>(
  type: 'path',
  description: string,
  options: ValidOptions<PathFlag, O>
): PathFlag & NoInfer<O>;
export function buildFlag<O>(
  type: 'string',
  description: string,
  options: ValidOptions<StringFlag, O>
): StringFlag & NoInfer<O>;
export function buildFlag(
  type: Flag['type'],
  description: string,
  options: Record<string, unknown> = {}
): Flag {
  if (type === 'choice') {
    validateChoices((options as FlagOptions<ChoiceFlag>).choices);
  }

  return { description, type, ...options } as Flag;
}

/**
 * Ensure that a choice list is valid
 */
function validateChoices(choices: readonly ScalarValue[]): void {
  if (choices.length === 0) {
    throw new Error('Choice flags must have at least one choice');
  }

  const kind = typeof choices[0];

  if (choices.some(c => typeof c !== kind)) {
    throw new Error('Choice flags must use values of the same type');
  }
}
