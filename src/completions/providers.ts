import type {
  CompletionProvider,
  CompletionProviderClass,
  CompletionSource
} from './provider.ts';
import { BashCompletionProvider } from './providers/bash.ts';
import { ZshCompletionProvider } from './providers/zsh.ts';
import type { SupportedShell } from './shells.ts';

const PROVIDERS: Record<SupportedShell, CompletionProviderClass> = {
  bash: BashCompletionProvider,
  zsh: ZshCompletionProvider
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
