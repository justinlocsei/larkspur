import { resolveConfig } from './config.ts';
import type { UserConfig } from './types/config.ts';
import type { Context, Metadata } from './types.ts';

/**
 * Build a CLI execution context
 */
export function createContext(
  meta: Metadata,
  config?: UserConfig
): Context {
  return {
    config: resolveConfig(config),
    meta
  };
}
