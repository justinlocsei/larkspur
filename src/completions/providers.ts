import type {
  CompletionProvider,
  CompletionProviderClass,
  CompletionSource
} from './provider.js';
import { BashCompletionProvider } from './providers/bash.js';
import type { SupportedShell } from './shells.js';

const PROVIDERS: Record<SupportedShell, CompletionProviderClass> = {
  bash: BashCompletionProvider
};

/**
 * Create a completion provider for a supported shell
 */
export function useProvider(
  shell: SupportedShell,
  cli: CompletionSource
): CompletionProvider {
  return new PROVIDERS[shell](cli);
}
