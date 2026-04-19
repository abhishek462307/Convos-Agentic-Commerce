import { callAzureOpenAI, getAiMessage, AIUsageResult } from './azure-client';
import { callOpenAI, getOpenAIMessage } from './providers/openai';
import { callAnthropic, getAnthropicMessage } from './providers/anthropic';
import logger from '@/lib/logger';

export type AIProvider = 'openai' | 'anthropic' | 'azure';

export interface MerchantAIConfig {
  provider: AIProvider;
  apiKey: string | null;
  model: string | null;
}

export function getMerchantAIConfig(merchant: any): MerchantAIConfig {
  const provider = (merchant.ai_provider as AIProvider) || 'openai';
  return {
    provider,
    apiKey: merchant.ai_api_key || null,
    model: merchant.ai_model || null,
  };
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  azure: 'gpt-4o',
};

function unavailableResult(message: string): AIUsageResult {
  return {
    response: {
      choices: [{ message: { role: 'assistant', content: message } }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    },
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export async function callAI(
  config: MerchantAIConfig,
  messages: any[],
  tools?: any[]
): Promise<AIUsageResult> {
  const { provider, apiKey, model } = config;

  if (provider === 'openai') {
    if (!apiKey) {
      return unavailableResult('OpenAI BYOK is selected, but no API key is configured. Add one in Settings → AI API Keys.');
    }
    try {
      return await callOpenAI(apiKey, model || DEFAULT_MODELS.openai, messages, tools);
    } catch (error) {
      logger.error('OpenAI BYOK request failed:', error);
      return unavailableResult('Your OpenAI key request failed. Please verify the key, model access, and account quota in Settings → AI API Keys.');
    }
  }

  if (provider === 'anthropic') {
    if (!apiKey) {
      return unavailableResult('Anthropic BYOK is selected, but no API key is configured. Add one in Settings → AI API Keys.');
    }
    try {
      return await callAnthropic(apiKey, model || DEFAULT_MODELS.anthropic, messages, tools);
    } catch (error) {
      logger.error('Anthropic BYOK request failed:', error);
      return unavailableResult('Your Anthropic key request failed. Please verify the key, model access, and account quota in Settings → AI API Keys.');
    }
  }

  if (provider === 'azure') {
    try {
      return await callAzureOpenAI(messages, tools);
    } catch (error) {
      logger.error('Azure request failed, retrying once:', error);
    }

    try {
      return await callAzureOpenAI(messages, tools);
    } catch (fallbackError) {
      logger.error('Azure fallback also failed:', fallbackError);
    }

    return unavailableResult('Your Azure OpenAI request failed. Please verify the endpoint, deployment, and key configuration.');
  }

  // Default server-side Azure provider
  try {
    return await callAzureOpenAI(messages, tools);
  } catch (error) {
    logger.error('Azure request failed, retrying once:', error);
  }

  try {
    return await callAzureOpenAI(messages, tools);
  } catch (fallbackError) {
    logger.error('Azure fallback also failed:', fallbackError);
  }

  return {
    response: {
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: "I'm temporarily unavailable. Please try again in a moment." }],
        },
      ],
      usage: { input_tokens: 0, output_tokens: 0 },
    },
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export function getMessageFromResponse(config: MerchantAIConfig, response: any): any {
  if (config.provider === 'openai' && config.apiKey) {
    return getOpenAIMessage(response);
  }
  if (config.provider === 'anthropic' && config.apiKey) {
    return getAnthropicMessage(response);
  }
  return getAiMessage(response);
}

export function isVoiceCompatible(provider: AIProvider): boolean {
  return provider === 'openai' || provider === 'azure';
}
