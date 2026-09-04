import { sortEntries } from '../../../src/utils.js';
import testBash from './completions/bash.js';
import type {
  ShellWithCompletions,
  SupportedShell,
  TestRunner
} from './completions/shared.js';

const RUNNERS: Record<SupportedShell, TestRunner> = {
  bash: testBash
};

/**
 * Expose all shells that support completion testing
 */
export function listShellsWithCompletions(): ShellWithCompletions[] {
  return sortEntries(RUNNERS).map(([name, test]): ShellWithCompletions => ({
    name,
    test
  }));
}
