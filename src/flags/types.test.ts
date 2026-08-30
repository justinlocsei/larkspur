import { describe, it } from 'vitest';

import * as T from '../tests/types.js';
import type {
  BooleanFlag,
  ChoiceFlag,
  FlagOfType,
  NumberFlag,
  PathFlag,
  StringFlag
} from './types.js';

describe('FlagOfType', () => {
  it('returns the flag with the given type', () => {
    T.assert<T.Equivalent<FlagOfType<'boolean'>, BooleanFlag>>(true);
    T.assert<T.Equivalent<FlagOfType<'choice'>, ChoiceFlag>>(true);
    T.assert<T.Equivalent<FlagOfType<'number'>, NumberFlag>>(true);
    T.assert<T.Equivalent<FlagOfType<'path'>, PathFlag>>(true);
    T.assert<T.Equivalent<FlagOfType<'string'>, StringFlag>>(true);
  });
});
