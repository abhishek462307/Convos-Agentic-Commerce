import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/api-auth';
import { buildSystemPrompt } from './prompt-builder';
import { getToolDefinitions } from './tool-definitions';
import { handleToolCall, ToolHandlerContext } from './tool-handlers';
import { logAIUsage } from './azure-client';
import { callAI, getMessageFromResponse, getMerchantAIConfig } from './ai-client';
import { rateLimit } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import { consumeStream, convertToModelMessages, streamText, stepCountIs } from 'ai';
import type { StorefrontUIMessage } from '@/types/storefront/ai';
import { createStorefrontMessageId, getStorefrontLanguageModel, normalizeStorefrontMessages, parseStorefrontMessageMetadata } from '@/lib/ai/storefront';
import { createStorefrontTools } from '@/lib/ai/storefront-tools';

const NON_PRODUCT_PATTERNS = [
  'order status', 'track order', 'where is my order', 'refund', 'return', 'cancel order',
  'login', 'log in', 'sign in', 'checkout', 'payment', 'shipping', 'delivery address',
  'coupon', 'promo code', 'discount code', 'my email', 'my account', 'support', 'help'
];

const PRODUCT_INTENT_KEYWORDS = [
  'food', 'treat', 'toy', 'collar', 'leash', 'bed', 'bowl', 'supplement', 'shampoo',
  'dog', 'cat', 'pet', 'puppy', 'kitten', 'product', 'products', 'item', 'items',
  'show me', 'looking for', 'need', 'want', 'have any', 'do you have', 'search', 'find'
];

const PRODUCT_QUERY_STOP_WORDS = new Set([
  'a', 'an', 'the', 'for', 'with', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'my',
  'me', 'i', 'im', 'please', 'show', 'find', 'search', 'need', 'want', 'looking', 'look',
  'have', 'any', 'do', 'you', 'your', 'is', 'are', 'can', 'get', 'hey', 'hi', 'hello', 'there',
  'whats', 'what', 'hows', 'how', 'wheres', 'where', 'up', 'going', 'is', 'it'
]);

const CONVERSATIONAL_PATTERNS = [
  'hi', 'hello', 'hey', 'there', 'thanks', 'thank you', 'ok', 'okay', 'cool', 'great', 'awesome',
  'yes', 'no', 'yeah', 'nope', 'maybe', 'doesn', 't', 'matter', 'sure', 'fine', 'no thanks',
  'anyone', 'around', 'up', 'going', 'howdy', 'morning', 'afternoon', 'evening'
];

function detectProductIntent(message: string) {
  const current = (message || '').toLowerCase().trim();

  if (!current || current.length < 2) {
    return { shouldSearch: false, shouldShowProducts: false, query: '' };
  }

  // Common phrases that shouldn't trigger search
  const CHATTER_PHRASES = [
    'doesn\'t matter', 'no matter', 'it doesn\'t matter', 'dont matter',
    'never mind', 'forget it', 'no thanks', 'not really', 'just looking'
  ];

  if (CHATTER_PHRASES.some(phrase => current.includes(phrase))) {
    return { shouldSearch: false, shouldShowProducts: false, query: '' };
  }

  const nonProductHit = NON_PRODUCT_PATTERNS.some((pattern) => current.includes(pattern));
  const productHit = PRODUCT_INTENT_KEYWORDS.some((keyword) => current.includes(keyword));

  const query = current
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !PRODUCT_QUERY_STOP_WORDS.has(word))
    .join(' ')
    .trim();

  const queryWords = query.split(/\s+/).filter(Boolean);
  const conversationalOnly = queryWords.length > 0 && queryWords.every((word) => CONVERSATIONAL_PATTERNS.includes(word));
  const shortNounLikeQuery = queryWords.length > 0 && queryWords.length <= 5 && !conversationalOnly;
  const shouldSearch = !nonProductHit && (productHit || shortNounLikeQuery);
  const shouldShowProducts = shouldSearch && !nonProductHit;

  return {
    shouldSearch,
    shouldShowProducts: shouldShowProducts && (productHit || queryWords.length > 0),
    query: query || current,
  };
}

function derivePreferenceState(memory: any[]) {
  const normalizedMemory = (memory || []).map((entry: any) => ({
    key: entry.memory_key,
    label: String(entry.memory_key || '').replace(/_/g, ' '),
    value: String(entry.memory_value || ''),
    source: 'store' as const,
  }));


  const merged = [...normalizedMemory].slice(0, 8);
  const refinementOptions = merged.slice(0, 4).map((entry) => ({
    label: entry.value.length > 24 ? entry.label : entry.value,
    action: `show me ${entry.value}`,
    type: entry.key.includes('budget') ? 'budget' : entry.key.includes('color') ? 'color' : entry.key.includes('size') ? 'size' : 'category'
  }));

  return { activePreferences: merged, refinementOptions };
}

function buildStorefrontResponseMetadata({
  toolContext,
  shouldShowProducts,
  consumerIntents,
  finalPlans,
  consumerEmail,
}: {
  toolContext: {
    products: any[];
    cartActions: any[];
    layoutResult: any;
    couponResult: any;
    bargainResult: any;
    suggestionButtons: any[];
    checkoutConfidence?: any;
    comparisonResult?: any;
    activePreferences?: any[];
    refinementOptions?: any[];
    activeFilters?: any[];
    variantPrompt?: any;
    recoveryState?: any;
    lastStableResultId?: string | null;
  };
  shouldShowProducts: boolean;
  consumerIntents: any[];
  finalPlans: any[];
  consumerEmail: string | null;
}) {
  const hasClarification = toolContext.suggestionButtons.length > 0;
  const shouldSuppressMetadata = !toolContext.layoutResult && hasClarification;

  return {
    products: !shouldSuppressMetadata && shouldShowProducts && toolContext.products.length > 0
      ? toolContext.products
      : undefined,
    cartActions: toolContext.cartActions.length > 0 ? toolContext.cartActions : undefined,
    layout: toolContext.layoutResult || undefined,
    intents: consumerIntents.length > 0 ? consumerIntents : undefined,
    plans: finalPlans && finalPlans.length > 0 ? finalPlans : undefined,
    coupon: toolContext.couponResult || undefined,
    bargain: toolContext.bargainResult || undefined,
    suggestionButtons: toolContext.suggestionButtons.length > 0 ? toolContext.suggestionButtons : undefined,
    checkoutConfidence: toolContext.checkoutConfidence || undefined,
    comparison: toolContext.comparisonResult || undefined,
    activePreferences: toolContext.activePreferences && toolContext.activePreferences.length > 0
      ? toolContext.activePreferences
      : undefined,
    refinementOptions: !shouldSuppressMetadata && toolContext.refinementOptions && toolContext.refinementOptions.length > 0
      ? toolContext.refinementOptions
      : undefined,
    activeFilters: !shouldSuppressMetadata && toolContext.activeFilters && toolContext.activeFilters.length > 0
      ? toolContext.activeFilters
      : undefined,
    variantPrompt: toolContext.variantPrompt || undefined,
    recoveryState: toolContext.recoveryState || undefined,
    lastStableResultId: toolContext.lastStableResultId || undefined,
    consumerEmail: consumerEmail || undefined,
    showCartButtons: toolContext.cartActions.length > 0,
  };
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = rateLimit(`ai:${ip}`, { maxRequests: 20, windowMs: 60_000 });
    if (!allowed) {
      return new Response("You're sending messages too fast. Please wait a moment.", { status: 429 });
    }

    const { message, messages: uiMessages, prompt, history, subdomain, cart, sessionId, email: userEmail, appliedCoupon } = await req.json();

      const [{ data: merchant }, authUser] = await Promise.all([
        supabase.from('merchants').select('*').eq('subdomain', subdomain).single(),
        getAuthUser(req)
      ]);

      if (!merchant) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
      }

      const { allowed: merchantAllowed } = rateLimit(`ai:merchant:${merchant.id}`, { maxRequests: 200, windowMs: 60_000 });
      if (!merchantAllowed) {
        return new Response("This store is experiencing high traffic. Please try again shortly.", { status: 429 });
      }

      const verifiedEmail = authUser?.email || null;
      
      // Refined Implicit Extraction: Only if explicitly provided or as direct answer
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const requestedEmail = userEmail || (history || []).slice(-2).find((h: any) => {
        if (h.sender !== 'user') return false;
        const text = h.text.toLowerCase();
        // Look for explicit intent or a naked email response to an AI question
        return text.includes('my email is') || text.includes('i am') || (text.length < 50 && emailRegex.test(text));
      })?.text.match(emailRegex)?.[0];
      
      const consumerEmail = verifiedEmail && (!requestedEmail || requestedEmail.toLowerCase() === verifiedEmail.toLowerCase()) ? verifiedEmail : (requestedEmail || null);

      const storeBargainEnabled = merchant.bargain_mode_enabled ?? false;
      const nowIso = new Date().toISOString();

      const [{ data: catalogMeta }, { data: activeDiscounts }, { data: activeBargains }, consumerData] = await Promise.all([
        supabase.from('products').select('category').eq('merchant_id', merchant.id).gt('stock_quantity', 0),
        supabase.from('discounts').select('code, type, value, min_order_amount, usage_limit, used_count, ends_at').eq('merchant_id', merchant.id).or(`ends_at.is.null,ends_at.gt.${nowIso}`).or(`starts_at.is.null,starts_at.lte.${nowIso}`),
        sessionId
          ? supabase.from('bargained_prices').select('*').eq('session_id', sessionId).eq('merchant_id', merchant.id).eq('status', 'active').gt('expires_at', new Date().toISOString())
          : Promise.resolve({ data: [] }),
        consumerEmail
          ? Promise.all([
              supabaseAdmin.from('agent_memory').select('*').eq('consumer_email', consumerEmail),
              supabaseAdmin.from('customer_intents').select('*').eq('consumer_email', consumerEmail).eq('status', 'active'),
            ])
          : Promise.resolve(null)
      ]);


      const productCount = catalogMeta?.length || 0;
      const uniqueCategories = [...new Set(catalogMeta?.map(p => p.category).filter(Boolean) || [])];

      let consumerProfile: Record<string, unknown> = {};
      let consumerMemory: any[] = [];
      let consumerIntents: any[] = [];

      if (consumerData) {
        consumerMemory = consumerData[0].data || [];
        consumerIntents = consumerData[1].data || [];
      }
      const derivedPreferenceState = derivePreferenceState(consumerMemory);

    const consumerContext = consumerEmail ? `
    CUSTOMER CONTEXT:
    - Email: ${consumerEmail}

    AGENT MEMORY (What you know about them):
    ${consumerMemory.length > 0 ? consumerMemory.map((m: any) => `- ${m.memory_key}: ${m.memory_value}`).join('\n') : 'No previous memory.'}

    PERSISTENT INTENTS (Current goals):
    ${consumerIntents.length > 0 ? consumerIntents.map((i: any) => `- ${i.intent_type}: ${i.goal} (Constraints: ${JSON.stringify(i.constraints)}) [Status: ${i.status}]`).join('\n') : 'No active intents.'}
    ` : 'No customer identity established yet. If they provide an email, you can access their profile and memory.';

    const systemPrompt = buildSystemPrompt({
      merchant, productCount, uniqueCategories, activeDiscounts,
      activeBargains: activeBargains || [], consumerContext, consumerProfile, consumerEmail,
      cart, sessionId, message, history, prompt
    });

    if (Array.isArray(uiMessages) && uiMessages.length > 0) {
      const storefrontMessages = uiMessages as StorefrontUIMessage[];
      const normalizedMessages = normalizeStorefrontMessages(storefrontMessages);
      const latestUserMessage = [...normalizedMessages].reverse().find((entry) => entry.sender === 'user')?.text || message || '';
      const selectionHistory = normalizedMessages
        .slice(0, Math.max(0, normalizedMessages.length - 1))
        .map((entry) => ({ sender: entry.sender, text: entry.text }));

      const sdkToolContext: ToolHandlerContext = {
        merchant,
        sessionId,
        subdomain,
        cart,
        userEmail,
        consumerEmail: consumerEmail ?? undefined,
        consumerProfile,
        activeBargains: activeBargains || [],
        storeBargainEnabled,
        products: [],
        cartActions: [],
        layoutResult: null,
        couponResult: appliedCoupon || null,
        bargainResult: null,
        suggestionButtons: [],
        activePreferences: derivedPreferenceState.activePreferences,
        refinementOptions: derivedPreferenceState.refinementOptions,
        activeFilters: [],
      };

      const isPriceMessage = /^(under|over|below|above|around)?\s*[\$₹€£]?\d+([.,]\d+)?\s*(rs|inr|usd|bucks|dollars|rupees)?$/i.test(latestUserMessage.trim());
      const isShortButtonResponse = latestUserMessage.trim().split(/\s+/).length <= 4 && selectionHistory.length > 0;
      const productIntent = detectProductIntent(latestUserMessage);
      const shouldRunProductPrefill = productIntent.shouldSearch && !isPriceMessage && !isShortButtonResponse;

      let precheckSummary = '';
      if (shouldRunProductPrefill) {
        try {
          const { toolMessage } = await handleToolCall(
            'search_products',
            {
              query: productIntent.query,
              inStockOnly: true,
            },
            'auto-search-products',
            sdkToolContext
          );
          const searchContent = JSON.parse(toolMessage.content);
          precheckSummary = Array.isArray(searchContent?.product_briefs)
            ? searchContent.product_briefs
                .slice(0, 5)
                .map((product: any) => {
                  const name = product?.name || 'Unknown';
                  const stock = product?.stock_summary || '';
                  const reason = product?.ai_reason || '';
                  return `- ${name}${stock ? ` (${stock})` : ''}${reason ? ` — ${reason}` : ''}`;
                })
                .join('\n')
            : 'No matching in-stock products found.';
        } catch (error) {
          logger.error('Automatic product search failed:', error);
        }
      }

      const selectionContext = {
        message: latestUserMessage,
        history: selectionHistory,
        cart,
      };

      const activeTools = createStorefrontTools(sdkToolContext, selectionContext);

      const model = getStorefrontLanguageModel(merchant);
      const modelMessages = await convertToModelMessages(storefrontMessages);
      const finalPlans = consumerEmail
        ? ((await supabaseAdmin
            .from('agent_plans')
            .select('*')
            .in('intent_id', (consumerIntents || []).map((i: any) => i.id))).data || [])
        : [];
      const enrichedSystemPrompt = precheckSummary
        ? `${systemPrompt}\n\nSILENT CATALOG PREFLIGHT:\n${precheckSummary}\nUse this context to respond naturally. Only update the web layout when the user is clearly searching for or asking about products. If it's just a greeting or general chatter, respond warmly without changing the layout. Do not repeat this product list or JSON in your response text.`
        : systemPrompt;

      const result = streamText({
        model,
        system: enrichedSystemPrompt,
        messages: modelMessages,
        tools: activeTools,
        stopWhen: stepCountIs(5),
        abortSignal: req.signal,
        onFinish: async ({ usage }) => {
          const promptTokens = (usage as any)?.inputTokens ?? (usage as any)?.promptTokens ?? 0;
          const completionTokens = (usage as any)?.outputTokens ?? (usage as any)?.completionTokens ?? 0;
          const totalTokens = (usage as any)?.totalTokens ?? (usage as any)?.total_tokens ?? promptTokens + completionTokens;
          logAIUsage(merchant.id, {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
          }).catch((e) => logger.error('Failed to log AI usage:', e));
        },
      });

      return result.toUIMessageStreamResponse({
        originalMessages: storefrontMessages,
        generateMessageId: createStorefrontMessageId,
        consumeSseStream: consumeStream,
        messageMetadata: ({ part }: any) => {
          if (part?.type === 'start' || part?.type === 'finish') {
            const metadata = buildStorefrontResponseMetadata({
              toolContext: sdkToolContext,
              shouldShowProducts: productIntent.shouldShowProducts,
              consumerIntents,
              finalPlans,
              consumerEmail,
            });
            const parsed = parseStorefrontMessageMetadata(metadata);
            return parsed || undefined;
          }
        },
      });
    }

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-10).map((h: any) => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: typeof h.text === 'string' ? h.text.slice(0, 500) : h.text
      })),
      { role: 'user', content: message }
    ];

      const tools = getToolDefinitions(storeBargainEnabled, !!consumerEmail, {
        message,
        history,
        cart,
      });
      const aiConfig = getMerchantAIConfig(merchant);
  
      const ctx: ToolHandlerContext = {
          merchant, sessionId, subdomain, cart, userEmail,
          consumerEmail: consumerEmail ?? undefined, consumerProfile, activeBargains: activeBargains || [],
        storeBargainEnabled,
        products: [],
        cartActions: [],
        layoutResult: null,
        couponResult: appliedCoupon || null,
        bargainResult: null,
        suggestionButtons: [],
        activePreferences: derivedPreferenceState.activePreferences,
        refinementOptions: derivedPreferenceState.refinementOptions,
        activeFilters: [],
      };
  
      const isPriceMessage = /^(under|over|below|above|around)?\s*[\$₹€£]?\d+([.,]\d+)?\s*(rs|inr|usd|bucks|dollars|rupees)?$/i.test(message.trim());
      const isShortButtonResponse = message.trim().split(/\s+/).length <= 4 && (history || []).length > 0;
  
      const productIntent = detectProductIntent(message);
      if (productIntent.shouldSearch && !isPriceMessage && !isShortButtonResponse) {
        try {
          const { toolMessage } = await handleToolCall(
            'search_products',
            {
              query: productIntent.query,
              inStockOnly: true,
            },
            'auto-search-products',
            ctx
          );
          const searchContent = JSON.parse(toolMessage.content);
          const searchSummary = Array.isArray(searchContent?.product_briefs)
            ? searchContent.product_briefs
                .slice(0, 5)
                .map((product: any) => {
                  const name = product?.name || 'Unknown';
                  const stock = product?.stock_summary || '';
                  const reason = product?.ai_reason || '';
                  return `- ${name}${stock ? ` (${stock})` : ''}${reason ? ` — ${reason}` : ''}`;
                })
                .join('\n')
            : 'No matching in-stock products found.';
  
            chatMessages.push({
              role: 'user',
              content: `Silent catalog precheck for the latest user message:\n${searchSummary}\nUse this context to respond naturally. ONLY update the web layout (using update_web_layout) if the user is clearly searching for or asking about products. If it's just a greeting or general chatter, respond warmly without changing the layout. DO NOT REPEAT THIS PRODUCT LIST OR JSON IN YOUR RESPONSE TEXT.`
            });
        } catch (error) {
          logger.error('Automatic product search failed:', error);
        }
      }
  
      let aiResult = await callAI(aiConfig, chatMessages, tools);
      let aiResponse = aiResult.response;
      let totalUsage = { ...aiResult.usage };
  
      let aiMessage = getMessageFromResponse(aiConfig, aiResponse);
      let toolIterations = 0;
      const MAX_TOOL_ITERATIONS = 5;

      while (aiMessage?.tool_calls && toolIterations < MAX_TOOL_ITERATIONS) {
        toolIterations++;
        const toolCalls = aiMessage.tool_calls;
        chatMessages.push(aiMessage);
  
        // SEQUENTIAL EXECUTION: Ensures search_products completes before update_web_layout runs
        for (const toolCall of toolCalls) {
          const funcName = toolCall.function.name;
          let args: any = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            logger.error('Failed to parse tool arguments:', e);
            chatMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: funcName,
              content: JSON.stringify({ error: 'Failed to parse arguments' })
            });
            continue;
          }
  
          const { toolMessage } = await handleToolCall(funcName, args, toolCall.id, ctx);
          chatMessages.push(toolMessage);
        }
  
        try {
            const followUpResult = await callAI(aiConfig, chatMessages, tools);
            totalUsage.prompt_tokens += followUpResult.usage.prompt_tokens;
            totalUsage.completion_tokens += followUpResult.usage.completion_tokens;
            totalUsage.total_tokens += followUpResult.usage.total_tokens;
            aiMessage = getMessageFromResponse(aiConfig, followUpResult.response);
        } catch (e) {
          logger.error('Follow-up call failed:', e);
          break;
        }
      }
  
      logAIUsage(merchant.id, totalUsage).catch((e) => logger.error('Failed to log AI usage:', e));
  
      if (ctx.cartActions.length > 0) {
        const events = ctx.cartActions.map(action => ({
          merchant_id: merchant.id,
          event_type: 'ai_cart_action',
          event_data: action,
          consumer_email: consumerEmail || null,
          session_id: sessionId || null
        }));
        void supabaseAdmin.from('ai_events').insert(events);
      }
  
        const { data: finalPlans } = consumerEmail ? await supabaseAdmin
          .from('agent_plans')
          .select('*')
          .in('intent_id', (consumerIntents || []).map((i: any) => i.id)) : { data: [] };
  
        const isRawJSONSlop = (text: string) => {
        const trimmed = (text || '').trim();
        return (trimmed.startsWith('{') || trimmed.startsWith('[') || (trimmed.includes('"id":') && trimmed.includes('"price":')));
      };
  
      let finalContent = aiMessage?.content || "";
      if (isRawJSONSlop(finalContent)) {
        logger.warn('AI returned raw JSON slop in text content, hiding it.');
        finalContent = "";
      }
  
      if (ctx.layoutResult && ctx.layoutResult.sections) {
        for (const section of ctx.layoutResult.sections) {
          if (Array.isArray(section.products) && section.products.length > 0) {
            section.products = section.products.map((p: any) => {
              const fullProduct = ctx.products.find(fp => fp.id === p.id || fp.name?.toLowerCase() === p.name?.toLowerCase());
              return fullProduct || p;
            });
          }
          if (Array.isArray(section.productIds) && section.productIds.length > 0 && (!Array.isArray(section.products) || section.products.length === 0)) {
            section.products = section.productIds
              .map((id: string) => ctx.products.find(fp => fp.id === id))
              .filter(Boolean);
          }
        }
      }
  
      const currency = merchant.currency || 'USD';
      const locale = merchant.locale || 'en-US';
      const formatPrice = (price: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(price);
  
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
        try {
            const metadata = buildStorefrontResponseMetadata({
              toolContext: ctx,
              shouldShowProducts: productIntent.shouldShowProducts,
              consumerIntents,
              finalPlans: finalPlans || [],
              consumerEmail,
            });
          controller.enqueue(encoder.encode(`METADATA:${JSON.stringify(metadata)}\n`));

          if (finalContent) {
            controller.enqueue(encoder.encode(finalContent));
          } else if (ctx.bargainResult && ctx.cartActions.some(a => a.type === 'add_to_cart')) {
            controller.enqueue(encoder.encode(`done! ${ctx.bargainResult.productName} added at ${formatPrice(Number(ctx.bargainResult.bargainedPrice))}—that deal's locked in for an hour!`));
          } else if (ctx.bargainResult) {
            controller.enqueue(encoder.encode(`boom! ${formatPrice(Number(ctx.bargainResult.bargainedPrice))} for ${ctx.bargainResult.productName}—say "add to cart" and it's yours!`));
          } else if (ctx.cartActions.some(a => a.type === 'add_to_cart')) {
            controller.enqueue(encoder.encode("added!"));
          } else if (productIntent.shouldShowProducts && ctx.products.length > 0) {
            controller.enqueue(encoder.encode("check these out!"));
          } else {
            controller.enqueue(encoder.encode("done!"));
          }
          controller.close();
        } catch {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

    } catch (error: any) {
    logger.error('AI Route Error:', error);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`METADATA:${JSON.stringify({
          recoveryState: {
            type: 'retry',
            message: 'the assistant hit a snag, but your shopping context is still safe',
            actions: [
              { label: 'try again', action: '__retry__' },
              { label: 'browse store', action: '__browse__' },
              { label: 'request callback', action: '__callback__' }
            ]
          }
        })}\n`));
        controller.enqueue(encoder.encode("sorry, i'm having a moment. try again or keep browsing."));
        controller.close();
      }
    });
    return new Response(stream, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  }
}
