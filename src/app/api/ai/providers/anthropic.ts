import { AIUsageResult } from '../azure-client';

interface OpenAITool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

interface OpenAIMessage {
  role: string;
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

function convertToolsToAnthropic(tools: OpenAITool[]) {
  return tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

function convertMessagesToAnthropic(messages: OpenAIMessage[]): { system: string; messages: any[] } {
  let system = '';
  const converted: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      system += (system ? '\n\n' : '') + msg.content;
      continue;
    }

    if (msg.role === 'assistant' && msg.tool_calls) {
      const content: any[] = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      for (const tc of msg.tool_calls) {
        let input: any = {};
        try {
          input = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
        } catch { /* empty */ }
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input,
        });
      }
      converted.push({ role: 'assistant', content });
      continue;
    }

    if (msg.role === 'tool') {
      const last = converted[converted.length - 1];
      const toolResult = {
        type: 'tool_result',
        tool_use_id: msg.tool_call_id,
        content: msg.content,
      };
      if (last?.role === 'user' && Array.isArray(last.content)) {
        last.content.push(toolResult);
      } else {
        converted.push({ role: 'user', content: [toolResult] });
      }
      continue;
    }

    converted.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  return { system, messages: converted };
}

function convertResponseToOpenAI(data: any) {
  const content = data.content || [];
  const textParts = content.filter((c: any) => c.type === 'text').map((c: any) => c.text);
  const toolUses = content.filter((c: any) => c.type === 'tool_use');

  const message: any = {
    role: 'assistant',
    content: textParts.join('\n') || null,
  };

  if (toolUses.length > 0) {
    message.tool_calls = toolUses.map((tu: any) => ({
      id: tu.id,
      type: 'function',
      function: {
        name: tu.name,
        arguments: JSON.stringify(tu.input),
      },
    }));
  }

  return {
    choices: [{ message, finish_reason: data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop' }],
    usage: {
      prompt_tokens: data.usage?.input_tokens ?? 0,
      completion_tokens: data.usage?.output_tokens ?? 0,
      total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    },
  };
}

export async function callAnthropic(
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
  tools?: OpenAITool[]
): Promise<AIUsageResult> {
  const { system, messages: anthropicMessages } = convertMessagesToAnthropic(messages);

  const body: any = {
    model,
    max_tokens: 1024,
    messages: anthropicMessages,
  };

  if (system) {
    body.system = system;
  }

  if (tools && tools.length > 0) {
    body.tools = convertToolsToAnthropic(tools);
    body.tool_choice = { type: 'auto' };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const openAIFormatted = convertResponseToOpenAI(data);

  return {
    response: openAIFormatted,
    usage: openAIFormatted.usage,
  };
}

export function getAnthropicMessage(resp: any) {
  return resp.choices?.[0]?.message || null;
}
