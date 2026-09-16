import { assert, describe, it } from 'vitest';

import { quote } from './shells.ts';

describe('quote', () => {
  it('wraps simple strings in single quotes', () => {
    assert.equal(quote('alfa'), "'alfa'");
  });

  it('escapes embedded single quotes', () => {
    assert.equal(quote("it's"), "'it'\\''s'");
  });
});
