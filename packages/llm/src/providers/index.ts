import { createAnthropicProvider } from './anthropic';
import { createGeminiProvider } from './gemini';
import {
  LMSTUDIO_BASE_URL,
  OLLAMA_BASE_URL,
  OPENAI_BASE_URL,
  OPENROUTER_BASE_URL,
  createOpenAiCompatibleProvider,
} from './openaiCompatible';
import type { Provider, ProviderConfig, ProviderId } from './types';

export * from './types';
export { ANTHROPIC_BASE_URL } from './anthropic';
export { GEMINI_BASE_URL } from './gemini';
export { OPENAI_BASE_URL, OPENROUTER_BASE_URL, OLLAMA_BASE_URL, LMSTUDIO_BASE_URL } from './openaiCompatible';

export function createProvider(id: ProviderId, config: ProviderConfig): Provider {
  switch (id) {
    case 'openai':
      return createOpenAiCompatibleProvider('openai', OPENAI_BASE_URL, config);
    case 'openrouter':
      return createOpenAiCompatibleProvider('openrouter', OPENROUTER_BASE_URL, config);
    case 'ollama':
      return createOpenAiCompatibleProvider('ollama', OLLAMA_BASE_URL, config);
    case 'lmstudio':
      return createOpenAiCompatibleProvider('lmstudio', LMSTUDIO_BASE_URL, config);
    case 'anthropic':
      return createAnthropicProvider(config);
    case 'gemini':
      return createGeminiProvider(config);
  }
}
