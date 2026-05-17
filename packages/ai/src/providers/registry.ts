import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

const providerMap = {
  openai: (model: string) => openai(model),
  anthropic: (model: string) => anthropic(model),
} as const;

export function getModel(provider: string, model: string): LanguageModel {
  const factory = providerMap[provider as keyof typeof providerMap];
  if (!factory) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  return factory(model);
}
