import { AIUsageResult } from '../azure-client';

export async function callOpenAI(
  apiKey: string,
  model: string,
  messages: any[],
  tools?: any[]
): Promise<AIUsageResult> {
  const body: any = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 800,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errText}`);
  }

  const data = await response.json();

  const usage = {
    prompt_tokens: data.usage?.prompt_tokens ?? 0,
    completion_tokens: data.usage?.completion_tokens ?? 0,
    total_tokens: data.usage?.total_tokens ?? 0,
  };

  return { response: data, usage };
}

export function getOpenAIMessage(resp: any) {
  return resp.choices?.[0]?.message || null;
}
