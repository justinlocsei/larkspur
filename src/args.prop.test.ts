import { test } from '@fast-check/vitest';
import { assert } from 'vitest';

import { NormalizedArgs } from './args.js';
import { argv } from './tests/arbitraries.js';

test.prop([argv])('normalization is idempotent', args => {
  const normalized = new NormalizedArgs(args).args;

  assert.deepEqual(
    new NormalizedArgs(normalized).args,
    normalized
  );
});

test.prop([argv])('normalization never shrinks the argument list', args => {
  assert.isAtLeast(new NormalizedArgs(args).args.length, args.length);
});
