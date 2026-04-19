import { handleToolCall, ToolHandlerContext } from '@/app/api/ai/tool-handlers';
import { ConvosStateType } from './state';
import logger from '@/lib/logger';

/**
 * Executes a tool call and updates the graph state.
 */
export async function executeTool(
  toolCall: { function: { name: string; arguments: string }; id: string },
  state: ConvosStateType
): Promise<Partial<ConvosStateType>> {
  // Handle both standard OpenAI format and LangChain format
  const funcName = toolCall.function?.name || (toolCall as any).name;
  const argStr = toolCall.function?.arguments || (toolCall as any).args;
  const toolCallId = toolCall.id || (toolCall as any).tool_call_id;

  if (!funcName) {
    logger.error('Invalid tool call structure (missing name):', toolCall);
    return {
      messages: [{
        role: 'tool',
        content: JSON.stringify({ error: 'Invalid tool call structure' }),
        tool_call_id: toolCallId || 'unknown'
      }] as any[]
    };
  }

  let args: any = {};
  if (typeof argStr === 'string') {
    try {
      args = JSON.parse(argStr);
    } catch (e) {
      logger.error('Failed to parse tool arguments:', e);
      return {
        messages: [{
          role: 'tool',
          content: JSON.stringify({ error: 'Invalid tool arguments' }),
          tool_call_id: toolCallId
        }] as any[]
      };
    }
  } else if (typeof argStr === 'object' && argStr !== null) {
    args = argStr;
  }

  const ctx: ToolHandlerContext = {
    merchant: state.merchant,
    sessionId: state.sessionId,
    subdomain: state.subdomain,
    cart: state.cart,
    consumerEmail: state.consumerEmail,
    consumerProfile: state.consumerProfile,
    activeBargains: state.activeBargains || [],
    storeBargainEnabled: state.storeBargainEnabled,
    products: state.products || [],
    cartActions: state.cartActions || [],
    layoutResult: state.layoutResult,
    couponResult: state.couponResult,
    bargainResult: state.bargainResult,
    suggestionButtons: state.suggestionButtons || [],
    activePreferences: state.activePreferences || [],
    refinementOptions: state.refinementOptions || [],
    comparisonResult: state.comparisonResult,
    checkoutConfidence: state.checkoutConfidence,
    userEmail: state.consumerEmail, // Use consumer email as user email
    isComplexGoal: state.isComplexGoal,
  };


  try {
    const { toolMessage } = await handleToolCall(funcName, args, toolCallId, ctx);
    
    // Update state based on tool context changes
    return {
      messages: [toolMessage],
      products: ctx.products,
      cartActions: ctx.cartActions,
      layoutResult: ctx.layoutResult,
      couponResult: ctx.couponResult,
      bargainResult: ctx.bargainResult,
      suggestionButtons: ctx.suggestionButtons,
      activePreferences: ctx.activePreferences,
      refinementOptions: ctx.refinementOptions,
      comparisonResult: ctx.comparisonResult,
      checkoutConfidence: ctx.checkoutConfidence,
      isComplexGoal: ctx.isComplexGoal,
    };

  } catch (error) {
    logger.error(`Tool execution failed for ${funcName}:`, error);
    return {
      messages: [{
        role: 'tool',
        content: JSON.stringify({ error: `Tool ${funcName} failed` }),
        tool_call_id: toolCallId
      }] as any[]
    };
  }
}
