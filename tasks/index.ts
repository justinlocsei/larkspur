#!/usr/bin/env node

import { run } from '../src/index.ts';
import build from './build.ts';
import check from './check.ts';
import format from './format.ts';
import test from './test.ts';

await run(
  { build, check, format, test },
  { description: 'Development tasks for Larkspur' }
);
