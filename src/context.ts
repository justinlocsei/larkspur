import { resolveConfig } from './config.js';
import type { UserConfig } from './types/config.js';
import type { Context, Metadata } from './types.js';

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
