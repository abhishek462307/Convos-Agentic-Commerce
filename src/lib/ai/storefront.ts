import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createOpenAI } from '@ai-sdk/openai';
import { generateId } from 'ai';

import { storefrontMessageMetadataSchema, storefrontUIMessagesToChatMessages, type StorefrontUIMessage } from '@/types/storefront/ai';

function normalizeAzureBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    if (url.pathname.includes('/responses')) {
      url.pathname = '/openai';
      url.search = '';
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return trimmed.replace(/\/$/, '');
  }
}

const azureEndpoint = normalizeAzureBaseUrl(process.env.AZURE_OPENAI_ENDPOINT || '');
const azureApiKey = process.env.AZURE_OPENAI_API_KEY || '';
const defaultAzureModel = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';

const azureProvider = azureEndpoint && azureApiKey
  ? createAzure({ baseURL: azureEndpoint, apiKey: azureApiKey })
  : null;

export function getStorefrontLanguageModel(merchant: any) {
  const provider = merchant.ai_provider || 'openai';
  const model = merchant.ai_model || null;

  if (provider === 'openai' && merchant.ai_api_key) {
    const openai = createOpenAI({ apiKey: merchant.ai_api_key });
    return openai(model || 'gpt-4o');
  }

  if (provider === 'anthropic' && merchant.ai_api_key) {
    const anthropic = createAnthropic({ apiKey: merchant.ai_api_key });
    return anthropic(model || 'claude-sonnet-4-20250514');
  }

  if (!azureProvider) {
    throw new Error('Azure OpenAI is not configured');
  }

  return azureProvider(model || defaultAzureModel);
}

export function getStorefrontEmbeddingModel() {
  if (!azureProvider) {
    throw new Error('Azure OpenAI is not configured');
  }

  return azureProvider.textEmbedding(process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small');
}

export function createStorefrontMessageId() {
  return generateId();
}

export function extractMessageText(message: Pick<StorefrontUIMessage, 'parts'>) {
  return message.parts
    .map((part) => {
      if (part.type === 'text') return part.text;
      if (part.type === 'reasoning') return part.text;
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function normalizeStorefrontMessages(messages: StorefrontUIMessage[]) {
  return storefrontUIMessagesToChatMessages(messages);
}

export function parseStorefrontMessageMetadata(metadata: unknown) {
  const parsed = storefrontMessageMetadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data : null;
}

export type { StorefrontUIMessage };
