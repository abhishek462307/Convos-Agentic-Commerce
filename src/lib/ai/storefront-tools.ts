import { tool } from 'ai';
import { z } from 'zod';

import { getToolDefinitions } from '@/app/api/ai/tool-definitions';
import { handleToolCall, type ToolHandlerContext } from '@/app/api/ai/tool-handlers';

const genericToolSchema = z.object({}).passthrough();

function makeTool(
  name: string,
  description: string,
  ctx: ToolHandlerContext,
  schema: z.ZodTypeAny = genericToolSchema
) {
  return tool({
    description,
    inputSchema: schema,
    execute: async (args) => {
      const { toolMessage, skip } = await handleToolCall(name, args as Record<string, any>, name, ctx);
      try {
        const parsed = JSON.parse(toolMessage.content);
        if (parsed && typeof parsed === 'object') {
          return { ...parsed, ...(skip ? { skipped: true } : {}) };
        }
        return { value: parsed, ...(skip ? { skipped: true } : {}) };
      } catch {
        return { value: toolMessage.content, ...(skip ? { skipped: true } : {}) };
      }
    },
  });
}

const toolSpecs: Record<string, { description: string; schema?: z.ZodTypeAny }> = {
  suggest_bundle: {
    description: 'Suggest a complementary bundle of products that can be shown as a special storefront section.',
    schema: z.object({
      bundleName: z.string(),
      description: z.string(),
      productIds: z.array(z.string()).min(1),
      discountPercentage: z.number().optional(),
    }),
  },
  search_products: {
    description: 'Search the storefront catalog using keywords and filters.',
    schema: z.object({
      query: z.string(),
      category: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      inStockOnly: z.boolean().optional(),
      size: z.string().optional(),
      color: z.string().optional(),
      urgency: z.string().optional(),
      dealsOnly: z.boolean().optional(),
      bargainOnly: z.boolean().optional(),
    }),
  },
  get_popular_products: {
    description: 'Return a curated list of popular or featured products.',
    schema: z.object({
      category: z.string().optional(),
      limit: z.number().optional(),
    }),
  },
  get_bargain_products: {
    description: 'Return products that support bargaining and their negotiation floor.',
    schema: z.object({
      productId: z.string().optional(),
    }),
  },
  get_product_details: {
    description: 'Return the deepest product details for a specific product.',
    schema: z.object({
      productId: z.string(),
    }),
  },
  compare_products: {
    description: 'Compare two or three products using normalized shopping signals.',
    schema: z.object({
      productIds: z.array(z.string()).min(2).max(3),
    }),
  },
  get_checkout_confidence: {
    description: 'Estimate checkout cost, shipping, taxes, and payment options.',
    schema: z.object({
      customerInfo: z.record(z.string(), z.any()).optional(),
      couponCode: z.string().optional(),
    }),
  },
  add_to_cart: {
    description: 'Add a product, and optionally a variant, to the customer cart.',
    schema: z.object({
      productId: z.string(),
      quantity: z.number().optional(),
      variantId: z.string().optional(),
      variantName: z.string().optional(),
    }),
  },
  remove_from_cart: {
    description: 'Remove a product or variant from the cart.',
    schema: z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      variantName: z.string().optional(),
    }),
  },
  apply_coupon: {
    description: 'Apply a discount code to the current cart.',
    schema: z.object({
      code: z.string(),
    }),
  },
  set_bargained_price: {
    description: 'Persist a negotiated price for a product.',
    schema: z.object({
      productId: z.string(),
      bargainedPrice: z.number(),
    }),
  },
  check_previous_purchases: {
    description: 'Check previous purchases for a customer email.',
    schema: z.object({
      email: z.string(),
    }),
  },
  update_agent_memory: {
    description: 'Write a durable customer memory entry.',
    schema: z.object({
      email: z.string(),
      key: z.string(),
      value: z.string(),
    }),
  },
  upsert_customer_intent: {
    description: 'Create or update a customer intent record.',
    schema: z.object({
      email: z.string(),
      intent_type: z.string(),
      goal: z.string(),
      constraints: z.record(z.string(), z.any()).optional(),
      suggested_by_ai: z.boolean().optional(),
    }),
  },
  create_agent_plan: {
    description: 'Create a plan for a customer intent.',
    schema: z.object({
      intentId: z.string(),
      steps: z.array(z.string()),
    }),
  },
  log_negotiation: {
    description: 'Record a negotiation step for a bargain interaction.',
    schema: z.object({
      intentId: z.string(),
      buyerOffer: z.number(),
      merchantOffer: z.number(),
      round: z.number().optional(),
      outcome: z.string().optional(),
    }),
  },
  get_agent_permissions: {
    description: 'Fetch the customer autonomy and permission profile.',
    schema: z.object({
      email: z.string(),
    }),
  },
  update_web_layout: {
    description: 'Update the storefront layout with AI-generated sections.',
    schema: z.object({}).passthrough(),
  },
  check_auth_status: {
    description: 'Check whether the customer is authenticated.',
    schema: z.object({}).passthrough(),
  },
  send_login_link: {
    description: 'Send a login link to the specified email.',
    schema: z.object({
      email: z.string(),
    }),
  },
  trigger_auth: {
    description: 'Trigger the storefront auth flow.',
    schema: z.object({
      reason: z.string().optional(),
    }),
  },
  start_checkout: {
    description: 'Begin a checkout flow from the AI assistant.',
    schema: z.object({
      customerInfo: z.record(z.string(), z.any()).optional(),
      paymentMethod: z.string().optional(),
    }),
  },
  show_suggestion_buttons: {
    description: 'Present clickable suggestion buttons to the customer.',
    schema: z.object({
      options: z.array(z.union([
        z.string(),
        z.object({
          label: z.string(),
          action: z.string().optional(),
        }).passthrough(),
      ])),
    }),
  },
  get_recommendations: {
    description: 'Return AI-personalized product recommendations.',
    schema: z.object({
      basedOn: z.string().optional(),
    }),
  },
  log_consumer_event: {
    description: 'Log a cross-session consumer event.',
    schema: z.object({
      email: z.string(),
      eventType: z.string(),
      eventData: z.record(z.string(), z.any()).optional(),
    }),
  },
  get_order_status: {
    description: 'Look up order status for a customer.',
    schema: z.object({
      email: z.string(),
      orderId: z.string().optional(),
    }),
  },
  request_refund_or_return: {
    description: 'Open a refund or return workflow.',
    schema: z.object({
      email: z.string(),
      orderId: z.string().optional(),
      reason: z.string().optional(),
    }),
  },
  create_support_request: {
    description: 'Create a support request for the merchant team.',
    schema: z.object({
      email: z.string().optional(),
      topic: z.string(),
      details: z.string().optional(),
      orderId: z.string().optional(),
    }),
  },
  apply_loyalty_reward: {
    description: 'Grant a loyalty reward to a customer.',
    schema: z.object({
      rewardType: z.string(),
    }),
  },
  generate_direct_payment_link: {
    description: 'Generate a payment link for the current cart.',
    schema: z.object({
      customerInfo: z.record(z.string(), z.any()).optional(),
    }),
  },
};

export function createStorefrontTools(
  ctx: ToolHandlerContext,
  selectionContext?: {
    message?: string;
    history?: Array<{ sender?: string; text?: string }>;
    cart?: any[];
  },
  options?: {
    disableProductSearch?: boolean;
    requireConcreteCart?: boolean;
    disableAuthTools?: boolean;
  }
) {
  const allTools = Object.fromEntries(
    Object.entries(toolSpecs).map(([name, spec]) => [
      name,
      makeTool(name, spec.description, ctx, spec.schema || genericToolSchema),
    ])
  );

  const selected = new Set(
    getToolDefinitions(ctx.storeBargainEnabled, !!ctx.consumerEmail, selectionContext)
      .map((toolDef: any) => toolDef.function?.name)
      .filter(Boolean)
  );

  if (options?.disableProductSearch) {
    selected.delete('search_products');
    selected.delete('get_popular_products');
  }

  if (options?.requireConcreteCart && (!ctx.cart || ctx.cart.length === 0)) {
    selected.delete('start_checkout');
    selected.delete('generate_direct_payment_link');
    selected.delete('apply_coupon');
  }

  if (options?.disableAuthTools) {
    selected.delete('send_login_link');
    selected.delete('trigger_auth');
    selected.delete('check_auth_status');
  }

  return Object.fromEntries(
    Object.entries(allTools).filter(([name]) => selected.has(name))
  );
}
