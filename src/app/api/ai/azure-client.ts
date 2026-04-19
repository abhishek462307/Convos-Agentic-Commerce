import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;

export interface AIUsageResult {
  response: any;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callAzureOpenAI(messages: any[], tools?: any[]): Promise<AIUsageResult> {
  let url = AZURE_OPENAI_ENDPOINT;
  const isResponsesApi = url.includes('/responses');
  
  if (!url.includes('/chat/completions') && !isResponsesApi) {
    const baseUrl = url.replace(/\/$/, '');
    if (baseUrl.includes('.openai.azure.com')) {
      url = `${baseUrl}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2024-08-01-preview`;
    }
  }

  const body: any = {};
  
    if (isResponsesApi) {
      body.model = DEPLOYMENT_NAME;
      const systemMessages = messages.filter(m => m.role === 'system');
      if (systemMessages.length > 0) {
        body.instructions = systemMessages.map(m => m.content).join('\n\n');
      }
      body.input = messages
        .filter(m => m.role !== 'system')
      .flatMap((m: any) => {
            // If we have the raw Responses API output items (includes reasoning), use them directly
            if (m.role === 'assistant' && m._raw_output?.length > 0) {
              return m._raw_output;
            }
            if (m.role === 'assistant' && m.tool_calls?.length > 0) {
              const items: any[] = [];
              if (m.content) {
                items.push({
                  type: 'message',
                  role: 'assistant',
                  content: [{ type: 'output_text', text: m.content }]
                });
              }
              m.tool_calls.forEach((tc: any) => {
                items.push({
                  type: 'function_call',
                  id: tc.id,
                  call_id: tc.id,
                  name: tc.function?.name || tc.name,
                  arguments: typeof tc.function?.arguments === 'string'
                    ? tc.function.arguments
                    : JSON.stringify(tc.function?.arguments ?? tc.arguments ?? {})
                });
              });
              return items;
            }
        if (m.role === 'tool') {
          return {
            type: 'function_call_output',
            call_id: m.tool_call_id,
            output: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          };
        }
        if (m.role === 'assistant') {
          return {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: m.content || '' }]
          };
        }
        if (m.role === 'user') {
          return {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: m.content || '' }]
          };
        }
        return m;
      });
  } else {
    body.messages = messages;
    body.temperature = 0.7;
    body.max_tokens = 800;
  }

  if (tools && tools.length > 0) {
    if (isResponsesApi) {
      body.tools = tools.map((t: any) => ({
        type: 'function',
        name: t.function?.name || t.name,
        description: t.function?.description || t.description,
        parameters: t.function?.parameters || t.parameters,
        strict: false
      }));
    } else {
      body.tools = tools;
    }
    body.tool_choice = 'auto';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_API_KEY
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  
    const estimatedPromptTokens = estimateTokens(JSON.stringify(messages));
    const estimatedCompletionTokens = estimateTokens(JSON.stringify(data.choices?.[0]?.message || data.output || ''));

    // Responses API uses input_tokens/output_tokens; Chat Completions uses prompt_tokens/completion_tokens
    const promptTokens = data.usage?.prompt_tokens ?? data.usage?.input_tokens ?? estimatedPromptTokens;
    const completionTokens = data.usage?.completion_tokens ?? data.usage?.output_tokens ?? estimatedCompletionTokens;

    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: 0
    };
    usage.total_tokens = data.usage?.total_tokens ?? (usage.prompt_tokens + usage.completion_tokens);

  return { response: data, usage };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function logAIUsage(merchantId: string, usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) {
  const MODEL_COSTS: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-5.2-chat': { input: 0.01, output: 0.03 },
  };
  
  const modelCost = MODEL_COSTS[DEPLOYMENT_NAME] || MODEL_COSTS['gpt-4o'];
  const estimatedCost = (usage.prompt_tokens / 1000 * modelCost.input) + (usage.completion_tokens / 1000 * modelCost.output);

  try {
    const { error } = await supabaseAdmin.from('ai_usage').insert({
      merchant_id: merchantId,
      model: DEPLOYMENT_NAME,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost: estimatedCost,
      request_type: 'chat'
    });
    if (error) {
      logger.error('Failed to log AI usage:', error);
    }
  } catch (e) {
    logger.error('Failed to log AI usage:', e);
  }
}

export async function logAIDecision({
  merchantId,
  sessionId,
  consumerEmail,
  orderId,
  decisionType,
  summary,
  factors,
  outcome,
  toolCalled,
  reasoningChain,
  channel
}: {
  merchantId: string;
  sessionId?: string;
  consumerEmail?: string;
  orderId?: string;
  decisionType: string;
  summary: string;
  factors: Record<string, any>;
  outcome: Record<string, any>;
  toolCalled?: string;
  reasoningChain?: { step: string; result: string }[];
  channel?: string;
}) {
  try {
    await supabaseAdmin.from('ai_decision_log').insert({
      merchant_id: merchantId,
      session_id: sessionId,
      consumer_email: consumerEmail,
      order_id: orderId,
      decision_type: decisionType,
      summary,
      human_summary: summary,
      factors,
      outcome,
      tool_called: toolCalled,
      reasoning_chain: reasoningChain || null,
      channel: channel || 'web'
    });
  } catch (e) {
    logger.error('Failed to log AI decision:', e);
  }
}

export function getAiMessage(resp: any) {
  let msg: any = null;
  if (resp.choices?.[0]?.message) {
    msg = resp.choices[0].message;
  } else if (resp.output) {
    const msgItem = resp.output.find((o: any) => o.type === 'message');
    const toolCalls = resp.output
      .filter((o: any) => o.type === 'function_call')
      .map((tc: any) => ({
        id: tc.call_id || tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments)
        }
      }));

    if (msgItem || toolCalls.length > 0) {
      const contentText = msgItem?.content
        ?.filter((c: any) => c.type === 'output_text')
        .map((c: any) => c.text)
        .join('\n') || "";
      
      msg = {
        role: msgItem?.role || 'assistant',
        content: contentText,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        // Preserve the raw output items so the tool loop can re-send them (required by Responses API)
        _raw_output: resp.output
      };
    }
  }
  return msg;
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CNY: '¥',
    KRW: '₩',
    BRL: 'R$',
    MXN: 'MX$',
    SGD: 'S$',
    HKD: 'HK$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    NZD: 'NZ$',
    ZAR: 'R',
    AED: 'د.إ',
    SAR: '﷼',
    THB: '฿',
    PHP: '₱',
    MYR: 'RM',
    IDR: 'Rp',
    VND: '₫',
    PLN: 'zł',
    TRY: '₺',
    RUB: '₽',
    ILS: '₪',
  };
  return symbols[currency] || currency;
}
