import { callAI, getMessageFromResponse, getMerchantAIConfig } from '@/app/api/ai/ai-client';
import { getToolDefinitions } from '@/app/api/ai/tool-definitions';
import { ConvosStateType } from '../state';
import logger from '@/lib/logger';

export async function callAiNode(state: ConvosStateType): Promise<Partial<ConvosStateType>> {
  const { merchant, messages, storeBargainEnabled, consumerEmail, cart } = state;
  const aiConfig = getMerchantAIConfig(merchant);
  
  // Convert messages to format expected by callAI (plain objects) if they are LangChain messages
    const formattedMessages = messages.map((m: any) => {
      if (typeof m.toDict === 'function') {
        const dict = m.toDict();
        let role = 'assistant';
        if (dict.type === 'human') role = 'user';
        else if (dict.type === 'system') role = 'system';
        else if (dict.type === 'tool') role = 'tool';
        
        return {
          role,
          content: dict.data.content,
          ...(dict.data.tool_calls ? { tool_calls: dict.data.tool_calls } : {}),
          ...(dict.data.tool_call_id ? { tool_call_id: dict.data.tool_call_id } : {}),
          ...(dict.data.id ? { id: dict.data.id } : {})
        };
      }
      return m;
    });


  // Get tool definitions dynamically based on state
  const lastMessage = formattedMessages[formattedMessages.length - 1];
  const tools = getToolDefinitions(storeBargainEnabled, !!consumerEmail, {
    message: typeof lastMessage.content === 'string' ? lastMessage.content : '',
    history: formattedMessages.slice(0, -1).map((m: any) => ({
      sender: m.role === 'user' ? 'user' : 'assistant',
      text: typeof m.content === 'string' ? m.content : ''
    })),
    cart,
  });

    // logger.debug('callAiNode input messages:', JSON.stringify(formattedMessages, null, 2));
    
    try {
      const aiResult = await callAI(aiConfig, formattedMessages, tools);

    const aiMessage = getMessageFromResponse(aiConfig, aiResult.response);
    
    const usage = {
      prompt_tokens: (state.usage?.prompt_tokens || 0) + aiResult.usage.prompt_tokens,
      completion_tokens: (state.usage?.completion_tokens || 0) + aiResult.usage.completion_tokens,
      total_tokens: (state.usage?.total_tokens || 0) + aiResult.usage.total_tokens
    };

    return {
      messages: [aiMessage],
      usage,
    };
  } catch (error) {
    logger.error('callAiNode failed:', error);
    throw error;
  }
}
