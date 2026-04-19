import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { logAIUsage } from '../azure-client';
import { callAI, getMerchantAIConfig, getMessageFromResponse } from '../ai-client';
import logger from '@/lib/logger';

type MerchantPermission =
  | 'orders'
  | 'products'
  | 'customers'
  | 'analytics'
  | 'settings'
  | 'team';

const TOOL_PERMISSIONS: Partial<Record<string, MerchantPermission>> = {
  list_orders: 'orders',
  get_order_details: 'orders',
  update_order_status: 'orders',
  bulk_update_orders: 'orders',
  list_products: 'products',
  create_product: 'products',
  update_product: 'products',
  bulk_update_products: 'products',
  generate_product_content: 'products',
  list_customers: 'customers',
  send_discount_to_customers: 'customers',
  get_dashboard_stats: 'analytics',
  get_top_products: 'analytics',
  get_analytics: 'analytics',
  get_conversation_funnel: 'analytics',
  list_conversations: 'analytics',
  create_discount: 'settings',
  list_discounts: 'settings',
  update_store_settings: 'settings',
};

const ROUTE_PERMISSIONS: Array<{ prefix: string; permission?: MerchantPermission }> = [
  { prefix: '/dashboard', permission: 'analytics' },
  { prefix: '/orders', permission: 'orders' },
  { prefix: '/products', permission: 'products' },
  { prefix: '/categories', permission: 'products' },
  { prefix: '/collections', permission: 'products' },
  { prefix: '/customers', permission: 'customers' },
  { prefix: '/analytics', permission: 'analytics' },
  { prefix: '/discounts', permission: 'settings' },
  { prefix: '/settings', permission: 'settings' },
  { prefix: '/conversations', permission: 'analytics' },
  { prefix: '/intelligence', permission: 'analytics' },
  { prefix: '/reports', permission: 'analytics' },
  { prefix: '/marketing', permission: 'settings' },
];

const CAPABILITY_GROUPS: Array<{
  permission: MerchantPermission
  title: string
  actions: string[]
}> = [
  {
    permission: 'orders',
    title: 'Orders',
    actions: ['Review today\'s orders', 'Check pending or unshipped orders', 'Update single or bulk order statuses']
  },
  {
    permission: 'products',
    title: 'Products',
    actions: ['List products and low-stock items', 'Create or update products', 'Bulk change pricing or stock', 'Generate product copy']
  },
  {
    permission: 'customers',
    title: 'Customers',
    actions: ['List top or inactive customers', 'Segment customers by spend or recency', 'Prepare discount outreach']
  },
  {
    permission: 'analytics',
    title: 'Analytics',
    actions: ['Check dashboard stats', 'Review revenue and conversion trends', 'Inspect storefront conversation funnel']
  },
  {
    permission: 'settings',
    title: 'Store controls',
    actions: ['Create and review discounts', 'Update store and AI settings', 'Open operational pages']
  },
];

function hasPermission(permissionSet: string[], permission?: MerchantPermission) {
  if (!permission) return true;
  return permissionSet.includes('*') || permissionSet.includes(permission);
}

function getBlockedToolResponse(funcName: string, permission: MerchantPermission) {
  const capabilityLabel: Record<MerchantPermission, string> = {
    orders: 'orders',
    products: 'products',
    customers: 'customers',
    analytics: 'analytics',
    settings: 'settings',
    team: 'team management',
  };

  return {
    blocked: true,
    error: `You do not have permission to use ${funcName}.`,
    content: `You don't have access to ${capabilityLabel[permission]} actions for this store. I can still help with the areas you do have access to.`,
    suggestions: ['Show allowed actions', 'What can I do here?', 'Ask something else'],
  };
}

function getAllowedCapabilities(permissions: string[]) {
  return CAPABILITY_GROUPS
    .filter((group) => hasPermission(permissions, group.permission))
    .map((group) => ({
      title: group.title,
      actions: group.actions,
    }));
}

async function getOperationalBrief(merchantId: string, permissions: string[]) {
  const priorities: Array<{
    title: string
    description: string
    priority: 'high' | 'medium'
    suggested_prompt: string
  }> = [];

  if (hasPermission(permissions, 'orders')) {
    const [{ count: pendingCount }, { count: unshippedCount }] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId).eq('status', 'pending'),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId).in('status', ['confirmed', 'processing']),
    ]);

    if ((pendingCount || 0) > 0) {
      priorities.push({
        title: 'Pending orders need confirmation',
        description: `${pendingCount} order${pendingCount === 1 ? '' : 's'} are still pending.`,
        priority: 'high',
        suggested_prompt: `List all ${pendingCount} pending orders and help me confirm them`
      });
    }

    if ((unshippedCount || 0) > 0) {
      priorities.push({
        title: 'Ready-to-ship orders are waiting',
        description: `${unshippedCount} confirmed order${unshippedCount === 1 ? '' : 's'} can move to shipping.`,
        priority: 'medium',
        suggested_prompt: `Show me all ${unshippedCount} orders ready to ship`
      });
    }
  }

  if (hasPermission(permissions, 'products')) {
    const { count: lowStockCount } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .lte('stock_quantity', 5)
      .gt('stock_quantity', 0);

    if ((lowStockCount || 0) > 0) {
      priorities.push({
        title: 'Low-stock products need attention',
        description: `${lowStockCount} active product${lowStockCount === 1 ? '' : 's'} are close to selling out.`,
        priority: 'high',
        suggested_prompt: 'What products are low on stock?'
      });
    }
  }

  if (hasPermission(permissions, 'analytics')) {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('total_amount, status')
      .eq('merchant_id', merchantId)
      .gte('created_at', since);

    const completedOrders = (orders || []).filter((order) => order.status !== 'cancelled');
    const revenue = completedOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    priorities.push({
      title: 'Weekly performance snapshot',
      description: `${completedOrders.length} completed order${completedOrders.length === 1 ? '' : 's'} generated ${revenue.toFixed(2)} in the last 7 days.`,
      priority: 'medium',
      suggested_prompt: 'Show me this week\'s analytics'
    });
  }

  return priorities.slice(0, 4);
}

function getNavigateResult(path: string, permissions: string[]) {
  const routeRule = ROUTE_PERMISSIONS.find((rule) => path === rule.prefix || path.startsWith(`${rule.prefix}/`));
  if (!routeRule || hasPermission(permissions, routeRule.permission)) {
    return { navigate: true, path };
  }

  return {
    blocked: true,
    error: `You do not have access to ${path}.`,
    content: `You don't have permission to open ${path}. I can help with pages that match your current access.`,
    suggestions: ['Show allowed actions', 'What can I do here?', 'Go back to dashboard'],
  };
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function summarizeToolResult(funcName: string, result: any, merchant: any) {
  if (!result) return '';

  if (funcName === 'list_customers' && Array.isArray(result)) {
    if (result.length === 0) return 'No customers matched that request.';
    const lines = result.slice(0, 5).map((customer: any, index: number) => {
      const spent = customer.total_spent != null ? formatCurrency(Number(customer.total_spent), merchant.currency || 'USD') : 'No spend data';
      const orders = customer.total_orders != null ? `${customer.total_orders} orders` : 'No order count';
      return `${index + 1}. ${customer.name || customer.email || 'Unnamed customer'} — ${spent}, ${orders}`;
    });
    return `Top customers:\n${lines.join('\n')}`;
  }

  if (funcName === 'list_orders' && Array.isArray(result)) {
    if (result.length === 0) return 'No orders matched that request.';
    const lines = result.slice(0, 5).map((order: any) => (
      `- ${order.id}: ${order.customer_name || 'Unknown customer'} · ${order.status} · ${formatCurrency(Number(order.total_amount || 0), merchant.currency || 'USD')}`
    ));
    return `Here are the matching orders:\n${lines.join('\n')}`;
  }

  if (funcName === 'list_products' && Array.isArray(result)) {
    if (result.length === 0) return 'No products matched that request.';
    const lines = result.slice(0, 5).map((product: any) => (
      `- ${product.name} · ${formatCurrency(Number(product.price || 0), merchant.currency || 'USD')}${product.stock_quantity != null ? ` · stock ${product.stock_quantity}` : ''}`
    ));
    return `Here are the matching products:\n${lines.join('\n')}`;
  }

  if (funcName === 'list_discounts' && Array.isArray(result)) {
    if (result.length === 0) return 'There are no active or recent discounts to review.';
    const lines = result.slice(0, 5).map((discount: any) => (
      `- ${discount.code} · ${discount.type} ${discount.value}${discount.is_active ? ' · active' : ' · inactive'}`
    ));
    return `Here are the latest discounts:\n${lines.join('\n')}`;
  }

  if (funcName === 'get_dashboard_stats' && typeof result === 'object') {
    return `In ${result.period || 'the selected period'}, you have ${result.total_orders || 0} orders, ${formatCurrency(Number(result.total_revenue || 0), merchant.currency || 'USD')} in revenue, and ${result.low_stock_count || 0} low-stock products.`;
  }

  if (funcName === 'review_current_page' && typeof result === 'object') {
    return result.review || 'I reviewed the current page and found a few useful next actions.';
  }

  if (funcName === 'get_top_products' && typeof result === 'object') {
    if (!Array.isArray(result.products) || result.products.length === 0) {
      return `You don't have any sold products in ${result.period || 'the selected period'} yet.`;
    }

    const lines = result.products.slice(0, 5).map((product: any, index: number) => (
      `${index + 1}. ${product.name} — ${product.units_sold} sold · ${formatCurrency(Number(product.revenue || 0), merchant.currency || 'USD')}`
    ));
    return `Your best selling products in ${result.period || 'the selected period'} are:\n${lines.join('\n')}`;
  }

  if (funcName === 'get_analytics' && typeof result === 'object') {
    return `For ${result.period || 'the selected period'}, revenue is ${formatCurrency(Number(result.revenue || 0), merchant.currency || 'USD')} across ${result.orders || 0} orders, with an average order value of ${formatCurrency(Number(result.avg_order_value || 0), merchant.currency || 'USD')}.`;
  }

  if (funcName === 'describe_capabilities' && Array.isArray(result.capabilities)) {
    if (result.capabilities.length === 0) {
      return 'Your current role has very limited assistant access right now.';
    }
    const lines = result.capabilities.map((group: any) => `- ${group.title}: ${Array.isArray(group.actions) ? group.actions.join(', ') : ''}`);
    return `Here’s what I can help you with right now:\n${lines.join('\n')}`;
  }

  if (funcName === 'create_discount' && result.success && result.discount?.code) {
    return `Discount ${result.discount.code} has been created successfully.`;
  }

  if (funcName === 'send_discount_to_customers' && result.success) {
    return `Created discount ${result.discount_code} for ${result.customers_targeted || 0} matching customers.`;
  }

  if (funcName === 'update_order_status' && result.success && result.order?.id) {
    return `Order ${result.order.id} is now marked as ${result.order.status}.`;
  }

  if (funcName === 'bulk_update_orders' && result.success) {
    return `Updated ${result.updated_count || 0} orders successfully.`;
  }

  if (funcName === 'create_product' && result.success && result.product?.name) {
    return `Created product ${result.product.name} successfully.`;
  }

  if (funcName === 'update_product' && result.success && result.product?.name) {
    return `Updated product ${result.product.name} successfully.`;
  }

  if (funcName === 'bulk_update_products' && result.success) {
    return `Updated ${result.updated_count || 0} products successfully.`;
  }

  if (funcName === 'generate_product_content' && result.success) {
    return result.applied
      ? `Generated and applied product content for ${result.products?.length || 0} products.`
      : `Generated preview content for ${result.preview?.length || 0} products.`;
  }

  return '';
}

const MERCHANT_SYSTEM_PROMPT = (
  merchant: any,
  routeContext?: string,
  capabilityContext?: { isOwner: boolean; permissions: string[]; roleLabel: string }
) => `You are an expert AI business assistant for ${merchant.store_name}. You have full control over this merchant's store on the Convos platform.

You can read data and perform actions: create/edit products, view orders, manage customers, check analytics, send campaigns, update store settings, create discounts, bulk operations, and more.

Your personality: Sharp, direct, business-focused. You understand e-commerce deeply. When the merchant asks something vague, ask one clarifying question. Never over-explain — give concise, actionable responses.

Store context:
- Store name: ${merchant.store_name}
- Subdomain: ${merchant.subdomain}
- Currency: ${merchant.currency || 'INR'}
- Plan: ${merchant.plan || 'free'}
- Bargain mode: ${merchant.bargain_mode_enabled ? 'enabled' : 'disabled'}
- Operator type: ${capabilityContext?.roleLabel || 'merchant operator'}
- Access level: full merchant control through the assistant
${routeContext ? `\nCurrent page context: ${routeContext}` : ''}

IMPORTANT RESPONSE RULES:
1. After completing an action or answering a query, always suggest 2-3 relevant follow-up actions as short button labels using the provide_suggestions tool.
2. For destructive or bulk operations (bulk status updates, mass discounts, bulk delete), ALWAYS use the request_confirmation tool first before executing.
3. Use navigate_to tool when the merchant asks to "go to", "show me", "open" a page.
4. Keep responses concise — use markdown tables for data, bullet points for lists.
5. When writing AI-generated product content, make it compelling and SEO-friendly.
6. If the operator asks what you can do or what is allowed, use the describe_capabilities tool.
7. If the operator asks what needs attention, what to do next, or for a daily brief, use the get_operational_brief tool.
8. If the operator asks about best selling products, top products, or what is selling best, use the get_top_products tool.
9. If the operator asks you to review the current page, audit what they should fix, or tell them what matters on this page, use the review_current_page tool.
10. When the operator asks for a direct outcome, prefer doing the work over describing what you could do.
11. You have full assistant control for this merchant. Execute requested store operations directly unless the request is destructive or bulk, in which case use the confirmation flow first.`;

function getMerchantTools(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'review_current_page',
        description: 'Review the current merchant panel page and suggest the highest-value next actions based on the route context.',
        parameters: {
          type: 'object',
          properties: {
            route_context: { type: 'string', description: 'Current route/page context from the merchant panel' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_dashboard_stats',
        description: 'Get overall dashboard statistics: revenue, orders, top products, recent activity.',
        parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', '7d', '30d', '90d'], description: 'Time period for stats' } }, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_top_products',
        description: 'Get the best selling products ranked by units sold and revenue for a given period.',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Time period for ranking products' },
            limit: { type: 'number', description: 'How many products to return (default 5)' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'describe_capabilities',
        description: 'Explain what the assistant can do for the current operator based on their access.',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_operational_brief',
        description: 'Summarize the most important actions that need attention right now for this store.',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_products',
        description: 'List products in the store with optional filters.',
        parameters: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by name' },
            category: { type: 'string', description: 'Filter by category' },
            low_stock: { type: 'boolean', description: 'Only show low stock items (<=5)' },
            limit: { type: 'number', description: 'Number of results (default 10)' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_product',
        description: 'Create a new product in the store.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            price: { type: 'number' },
            description: { type: 'string' },
            category: { type: 'string' },
            stock_quantity: { type: 'number' },
            bargain_enabled: { type: 'boolean' },
            bargain_min_price: { type: 'number' }
          },
          required: ['name', 'price']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_product',
        description: 'Update an existing product by ID.',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Product ID to update' },
            name: { type: 'string' },
            price: { type: 'number' },
            description: { type: 'string' },
            category: { type: 'string' },
            stock_quantity: { type: 'number' },
            is_active: { type: 'boolean' },
            bargain_enabled: { type: 'boolean' },
            bargain_min_price: { type: 'number' }
          },
          required: ['product_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'bulk_update_products',
        description: 'Update multiple products at once. Use for bulk price changes, stock updates, enabling/disabling products.',
        parameters: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'Filter to select products',
              properties: {
                category: { type: 'string' },
                is_active: { type: 'boolean' },
                low_stock: { type: 'boolean', description: 'Only products with stock <= 5' },
                all: { type: 'boolean', description: 'Apply to all products' }
              }
            },
            updates: {
              type: 'object',
              description: 'Fields to update on matching products',
              properties: {
                price_adjustment: { type: 'number', description: 'Add/subtract this amount from current price (use negative to decrease)' },
                price_multiplier: { type: 'number', description: 'Multiply current price by this factor (e.g. 0.9 for 10% discount)' },
                stock_quantity: { type: 'number' },
                is_active: { type: 'boolean' },
                bargain_enabled: { type: 'boolean' },
                category: { type: 'string' }
              }
            },
            dry_run: { type: 'boolean', description: 'If true, only returns preview of what would change without applying' }
          },
          required: ['filter', 'updates']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_orders',
        description: 'List recent orders with optional status filter.',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], description: 'Filter by order status' },
            limit: { type: 'number', description: 'Number of results (default 10)' },
            period: { type: 'string', enum: ['today', '7d', '30d'], description: 'Time period filter' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_order_details',
        description: 'Get full details of a specific order by ID or order number.',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: 'Order ID or order number' }
          },
          required: ['order_id']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_order_status',
        description: 'Update the status of an order.',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string' },
            status: { type: 'string', enum: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
            tracking_number: { type: 'string', description: 'Optional tracking number when marking shipped' }
          },
          required: ['order_id', 'status']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'bulk_update_orders',
        description: 'Update status of multiple orders at once. Great for bulk shipping or confirming many orders.',
        parameters: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipped'], description: 'Current status to filter by' },
                period: { type: 'string', enum: ['today', '7d', '30d'], description: 'Filter by date range' }
              }
            },
            new_status: { type: 'string', enum: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
            dry_run: { type: 'boolean', description: 'If true, preview without applying' }
          },
          required: ['filter', 'new_status']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_customers',
        description: 'List customers with optional filters. Can sort by spend, order count, or recent activity.',
        parameters: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by name or email' },
            sort_by: { type: 'string', enum: ['total_spent', 'order_count', 'recent'], description: 'Sort customers by metric' },
            inactive_days: { type: 'number', description: 'Only return customers inactive for this many days (no orders in N days)' },
            limit: { type: 'number', description: 'Number of results (default 10)' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'send_discount_to_customers',
        description: 'Create a targeted discount code and conceptually send it to a group of customers. Use for win-back campaigns targeting inactive customers.',
        parameters: {
          type: 'object',
          properties: {
            customer_filter: {
              type: 'object',
              properties: {
                inactive_days: { type: 'number', description: 'Target customers inactive for N days' },
                min_spent: { type: 'number', description: 'Only customers who have spent at least this amount' },
                customer_ids: { type: 'array', items: { type: 'string' }, description: 'Specific customer IDs' }
              }
            },
            discount: {
              type: 'object',
              properties: {
                code: { type: 'string', description: 'Coupon code (will be auto-generated if not provided)' },
                type: { type: 'string', enum: ['percentage', 'fixed'] },
                value: { type: 'number' },
                ends_at: { type: 'string', description: 'ISO date string for expiry' }
              },
              required: ['type', 'value']
            },
            message: { type: 'string', description: 'Message to describe the campaign intent' }
          },
          required: ['customer_filter', 'discount']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_discount',
        description: 'Create a discount/coupon code.',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Coupon code (e.g. SAVE20)' },
            type: { type: 'string', enum: ['percentage', 'fixed'], description: 'Discount type' },
            value: { type: 'number', description: 'Discount amount (percent or fixed value)' },
            min_order_amount: { type: 'number', description: 'Minimum order amount to apply' },
            usage_limit: { type: 'number', description: 'Max uses allowed' },
            ends_at: { type: 'string', description: 'Expiry date in ISO format' }
          },
          required: ['code', 'type', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_discounts',
        description: 'List all discount codes for the store.',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_analytics',
        description: 'Get detailed sales analytics, revenue breakdown, and performance metrics.',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Analytics period' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_conversation_funnel',
        description: 'Get the conversation funnel report: how many AI chat sessions led to product views, cart adds, and completed orders.',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Report period' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'generate_product_content',
        description: 'Use AI to write compelling product titles, descriptions, and SEO meta for one or more products.',
        parameters: {
          type: 'object',
          properties: {
            product_ids: { type: 'array', items: { type: 'string' }, description: 'Product IDs to generate content for' },
            style: { type: 'string', enum: ['casual', 'professional', 'luxury', 'playful'], description: 'Writing style (default: professional)' },
            apply: { type: 'boolean', description: 'If true, immediately save the generated content to products' }
          },
          required: ['product_ids']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_store_settings',
        description: 'Update store settings like AI persona, bargain mode, store description.',
        parameters: {
          type: 'object',
          properties: {
            store_name: { type: 'string' },
            ai_persona: { type: 'string', description: 'AI personality description for the storefront' },
            bargain_mode_enabled: { type: 'boolean' },
            store_description: { type: 'string' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'list_conversations',
        description: 'List recent AI conversations/sessions from the storefront.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of conversations (default 10)' },
            has_order: { type: 'boolean', description: 'Filter to sessions that resulted in an order' }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'navigate_to',
        description: 'Navigate the merchant to a specific dashboard page.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Dashboard path e.g. /products, /orders, /customers, /analytics, /discounts, /settings, /conversations, /intelligence, /marketing/campaigns' }
          },
          required: ['path']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'provide_suggestions',
        description: 'Provide 2-3 short follow-up action suggestions as clickable buttons after a response. Always call this after answering.',
        parameters: {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: { type: 'string' }, description: 'Short action labels (max 30 chars each, 2-3 items)' }
          },
          required: ['suggestions']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'request_confirmation',
        description: 'Show an inline confirmation card to the merchant before executing a destructive or bulk operation. Include executable action_payload with a tool_name and tool_args so the confirm button can run it directly.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short action title (e.g. "Ship 12 orders")' },
            description: { type: 'string', description: 'What will happen when confirmed' },
            confirm_label: { type: 'string', description: 'Label for confirm button (default: Confirm)' },
            cancel_label: { type: 'string', description: 'Label for cancel button (default: Cancel)' },
            action_payload: {
              type: 'object',
              description: 'Data to pass back when confirmed. For direct execution, include tool_name and tool_args.',
              properties: {
                tool_name: { type: 'string', description: 'Tool to execute after confirmation' },
                tool_args: { type: 'object', description: 'Arguments for the tool execution' }
              }
            }
          },
          required: ['title', 'description']
        }
      }
    }
  ];
}

async function executeConfirmedMerchantAction(input: {
  actionPayload: Record<string, unknown>
  merchantId: string
  merchant: any
  permissions: string[]
}) {
  const payload = input.actionPayload || {};
  const rawToolName = typeof payload.tool_name === 'string'
    ? payload.tool_name
    : typeof payload.funcName === 'string'
      ? payload.funcName
      : typeof payload.function_name === 'string'
        ? payload.function_name
        : null;

  const toolArgs = payload.tool_args && typeof payload.tool_args === 'object' && !Array.isArray(payload.tool_args)
    ? payload.tool_args as Record<string, unknown>
    : payload.args && typeof payload.args === 'object' && !Array.isArray(payload.args)
      ? payload.args as Record<string, unknown>
      : {};

  if (!rawToolName) {
    return null;
  }

  const toolName = rawToolName.trim();
  if (!toolName || ['request_confirmation', 'provide_suggestions'].includes(toolName)) {
    return null;
  }

  if (toolName === 'navigate_to') {
    return handleMerchantTool(toolName, toolArgs, input.merchantId, input.merchant, input.permissions);
  }

  const confirmedArgs = ['bulk_update_products', 'bulk_update_orders', 'send_discount_to_customers'].includes(toolName)
    ? { ...toolArgs, dry_run: false }
    : toolArgs;

  return handleMerchantTool(toolName, confirmedArgs, input.merchantId, input.merchant, input.permissions);
}

async function handleMerchantTool(
  funcName: string,
  args: any,
  merchantId: string,
  merchant: any,
  permissions: string[]
): Promise<any> {
  if (funcName === 'navigate_to') {
    return getNavigateResult(args.path, permissions);
  }

  if (funcName === 'provide_suggestions') {
    return { suggestions: args.suggestions };
  }

  if (funcName === 'request_confirmation') {
    return {
      action_card: {
        type: 'confirm',
        title: args.title,
        description: args.description,
        confirm_label: args.confirm_label || 'Confirm',
        cancel_label: args.cancel_label || 'Cancel',
        action_payload: args.action_payload || {}
      }
    };
  }

  const requiredPermission = TOOL_PERMISSIONS[funcName];
  if (requiredPermission && !hasPermission(permissions, requiredPermission)) {
    return getBlockedToolResponse(funcName, requiredPermission);
  }

  if (funcName === 'describe_capabilities') {
    return {
      is_owner: permissions.includes('*'),
      permissions,
      capabilities: getAllowedCapabilities(permissions),
    };
  }

  if (funcName === 'review_current_page') {
    const route = String(args.route_context || '').toLowerCase();

    if (route.includes('/orders')) {
      return {
        review: 'You are on the orders page. The highest-value actions here are clearing pending orders, moving confirmed orders to shipping, and identifying failed or cancelled orders that need follow-up.',
        suggestions: ['Show pending orders', 'Show ready to ship orders', 'Find failed payments'],
      };
    }

    if (route.includes('/products') || route.includes('/categories') || route.includes('/collections')) {
      return {
        review: 'You are on the catalog side of the store. The highest-value actions here are fixing low stock, improving weak product copy, and checking pricing consistency across active products.',
        suggestions: ['Show low stock products', 'Review product pricing', 'Generate better product copy'],
      };
    }

    if (route.includes('/customers')) {
      return {
        review: 'You are on the customers page. The highest-value actions here are finding high-value customers, spotting churn risk, and preparing targeted discount outreach.',
        suggestions: ['List top customers', 'Find inactive customers', 'Create a reactivation discount'],
      };
    }

    if (route.includes('/analytics') || route.includes('/reports') || route.includes('/intelligence')) {
      return {
        review: 'You are on an analytics page. The highest-value actions here are identifying revenue trends, top products, and the biggest conversion or operational bottlenecks.',
        suggestions: ['Show weekly analytics', 'Show best selling products', 'What needs attention today?'],
      };
    }

    if (route.includes('/marketing') || route.includes('/discounts')) {
      return {
        review: 'You are on a growth page. The highest-value actions here are creating a targeted discount, segmenting customers, and reviewing which promotions should be launched next.',
        suggestions: ['Create a discount', 'List active discounts', 'Target inactive customers'],
      };
    }

    if (route.includes('/settings')) {
      return {
        review: 'You are on settings. The highest-value actions here are checking payments, domain setup, AI configuration, and any operational settings that block conversion.',
        suggestions: ['Review payment settings', 'Review AI settings', 'Open domain settings'],
      };
    }

    return {
      review: 'You are in the merchant panel. The highest-value next step is to identify what needs attention and then drill into the right operational area.',
      suggestions: ['What needs attention today?', 'Show today\'s orders', 'Review this week\'s performance'],
    };
  }

  if (funcName === 'get_operational_brief') {
    return {
      priorities: await getOperationalBrief(merchantId, permissions),
    };
  }

  if (funcName === 'get_dashboard_stats') {
    const period = args.period || '30d';
    const daysMap: Record<string, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period] || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [{ data: orders }, { data: products }, { data: customers }] = await Promise.all([
      supabaseAdmin.from('orders').select('id, total_amount, status, created_at').eq('merchant_id', merchantId).gte('created_at', since),
      supabaseAdmin.from('products').select('id, name, price, stock_quantity, is_active').eq('merchant_id', merchantId),
      supabaseAdmin.from('store_customers').select('id, total_spent').eq('merchant_id', merchantId)
    ]);

    const completedOrders = (orders || []).filter(o => o.status !== 'cancelled');
    const revenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const lowStock = (products || []).filter(p => p.is_active && p.stock_quantity !== null && p.stock_quantity <= 5);

    return {
      period,
      total_orders: completedOrders.length,
      total_revenue: revenue,
      total_customers: customers?.length || 0,
      total_products: products?.length || 0,
      low_stock_count: lowStock.length,
      low_stock_products: lowStock.slice(0, 5).map(p => ({ id: p.id, name: p.name, stock: p.stock_quantity })),
      pending_orders: (orders || []).filter(o => o.status === 'pending').length,
      average_order_value: completedOrders.length > 0 ? (revenue / completedOrders.length).toFixed(2) : 0
    };
  }

  if (funcName === 'get_top_products') {
    const period = args.period || '30d';
    const limit = Math.min(Number(args.limit || 5), 10);
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const since = new Date(Date.now() - (daysMap[period] || 30) * 86400000).toISOString();

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('merchant_id', merchantId)
      .gte('created_at', since)
      .neq('status', 'cancelled');

    if (ordersError) {
      return { error: ordersError.message };
    }

    const orderIds = (orders || []).map((order) => order.id).filter(Boolean);
    if (orderIds.length === 0) {
      return { period, products: [] };
    }

    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity, price_at_purchase, products(name, price, stock_quantity)')
      .in('order_id', orderIds);

    if (itemsError) {
      return { error: itemsError.message };
    }

    const byProduct = new Map<string, {
      id: string
      name: string
      units_sold: number
      revenue: number
      current_price: number
      stock_quantity: number | null
    }>();

    for (const item of orderItems || []) {
      if (!item.product_id) continue;
      const existing = byProduct.get(item.product_id) || {
        id: item.product_id,
        name: (item as any).products?.name || 'Unnamed product',
        units_sold: 0,
        revenue: 0,
        current_price: Number((item as any).products?.price || 0),
        stock_quantity: (item as any).products?.stock_quantity ?? null,
      };
      existing.units_sold += Number(item.quantity || 0);
      existing.revenue += Number(item.price_at_purchase || (item as any).products?.price || 0) * Number(item.quantity || 0);
      byProduct.set(item.product_id, existing);
    }

    const products = Array.from(byProduct.values())
      .sort((a, b) => {
        if (b.units_sold !== a.units_sold) return b.units_sold - a.units_sold;
        return b.revenue - a.revenue;
      })
      .slice(0, limit);

    return { period, products };
  }

  if (funcName === 'list_products') {
    let query = supabaseAdmin.from('products').select('id, name, price, category, stock_quantity, is_active, bargain_enabled, bargain_min_price, created_at').eq('merchant_id', merchantId);
    if (args.search) query = query.ilike('name', `%${args.search}%`);
    if (args.category) query = query.ilike('category', `%${args.category}%`);
    if (args.low_stock) query = query.lte('stock_quantity', 5).gt('stock_quantity', 0);
    const { data } = await query.order('created_at', { ascending: false }).limit(args.limit || 10);
    return data || [];
  }

  if (funcName === 'create_product') {
    const { data, error } = await supabaseAdmin.from('products').insert({
      merchant_id: merchantId,
      name: args.name,
      price: args.price,
      description: args.description || '',
      category: args.category || 'General',
      stock_quantity: args.stock_quantity ?? 100,
      is_active: true,
      bargain_enabled: args.bargain_enabled || false,
      bargain_min_price: args.bargain_min_price || null
    }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, product: data };
  }

  if (funcName === 'update_product') {
    const { product_id, ...updates } = args;
    const cleanUpdates: any = {};
    if (updates.name !== undefined) cleanUpdates.name = updates.name;
    if (updates.price !== undefined) cleanUpdates.price = updates.price;
    if (updates.description !== undefined) cleanUpdates.description = updates.description;
    if (updates.category !== undefined) cleanUpdates.category = updates.category;
    if (updates.stock_quantity !== undefined) cleanUpdates.stock_quantity = updates.stock_quantity;
    if (updates.is_active !== undefined) cleanUpdates.is_active = updates.is_active;
    if (updates.bargain_enabled !== undefined) cleanUpdates.bargain_enabled = updates.bargain_enabled;
    if (updates.bargain_min_price !== undefined) cleanUpdates.bargain_min_price = updates.bargain_min_price;

    const { data, error } = await supabaseAdmin.from('products').update(cleanUpdates).eq('id', product_id).eq('merchant_id', merchantId).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, product: data };
  }

  if (funcName === 'bulk_update_products') {
    let query = supabaseAdmin.from('products').select('id, name, price, stock_quantity, is_active, category').eq('merchant_id', merchantId);
    
    if (args.filter?.category) query = query.ilike('category', `%${args.filter.category}%`);
    if (args.filter?.is_active !== undefined) query = query.eq('is_active', args.filter.is_active);
    if (args.filter?.low_stock) query = query.lte('stock_quantity', 5).gt('stock_quantity', 0);

    const { data: products } = await query;
    if (!products || products.length === 0) return { success: false, message: 'No products matched the filter.' };

    if (args.dry_run) {
      const preview = products.slice(0, 5).map(p => ({
        name: p.name,
        current_price: p.price,
        new_price: args.updates.price_adjustment 
          ? p.price + args.updates.price_adjustment 
          : args.updates.price_multiplier 
          ? Math.round(p.price * args.updates.price_multiplier) 
          : p.price
      }));
      return { dry_run: true, total_affected: products.length, preview };
    }

    let updated = 0;
    for (const product of products) {
      const updateData: any = {};
      if (args.updates.is_active !== undefined) updateData.is_active = args.updates.is_active;
      if (args.updates.bargain_enabled !== undefined) updateData.bargain_enabled = args.updates.bargain_enabled;
      if (args.updates.category !== undefined) updateData.category = args.updates.category;
      if (args.updates.stock_quantity !== undefined) updateData.stock_quantity = args.updates.stock_quantity;
      if (args.updates.price_adjustment !== undefined) updateData.price = Math.max(0, product.price + args.updates.price_adjustment);
      if (args.updates.price_multiplier !== undefined) updateData.price = Math.max(0, Math.round(product.price * args.updates.price_multiplier));

      if (Object.keys(updateData).length > 0) {
        await supabaseAdmin.from('products').update(updateData).eq('id', product.id);
        updated++;
      }
    }
    return { success: true, updated_count: updated };
  }

  if (funcName === 'list_orders') {
    let query = supabaseAdmin.from('orders').select('id, status, total_amount, customer_info, created_at').eq('merchant_id', merchantId);
    if (args.status) query = query.eq('status', args.status);
    if (args.period) {
      const daysMap: Record<string, number> = { today: 1, '7d': 7, '30d': 30 };
      const since = new Date(Date.now() - (daysMap[args.period] || 30) * 86400000).toISOString();
      query = query.gte('created_at', since);
    }
    const { data } = await query.order('created_at', { ascending: false }).limit(args.limit || 10);
    return (data || []).map((o: any) => ({
      id: o.id,
      status: o.status,
      total_amount: o.total_amount,
      customer_name: o.customer_info?.name || 'Unknown',
      customer_email: o.customer_info?.email || '',
      created_at: o.created_at
    }));
  }

  if (funcName === 'get_order_details') {
    const { data } = await supabaseAdmin.from('orders').select('*, order_items(*, products(name, price))').eq('merchant_id', merchantId).eq('id', args.order_id).single();
    return data || { error: 'Order not found' };
  }

  if (funcName === 'update_order_status') {
    const updates: any = { status: args.status };
    if (args.tracking_number) updates.tracking_number = args.tracking_number;
    const { data, error } = await supabaseAdmin.from('orders').update(updates).eq('id', args.order_id).eq('merchant_id', merchantId).select('id, status').single();
    if (error) return { success: false, error: error.message };
    return { success: true, order: data };
  }

  if (funcName === 'bulk_update_orders') {
    let query = supabaseAdmin.from('orders').select('id, status').eq('merchant_id', merchantId);
    if (args.filter?.status) query = query.eq('status', args.filter.status);
    if (args.filter?.period) {
      const daysMap: Record<string, number> = { today: 1, '7d': 7, '30d': 30 };
      const since = new Date(Date.now() - (daysMap[args.filter.period] || 7) * 86400000).toISOString();
      query = query.gte('created_at', since);
    }

    const { data: orders } = await query.limit(100);
    if (!orders || orders.length === 0) return { success: false, message: 'No orders matched the filter.' };

    if (args.dry_run) {
      return { dry_run: true, total_affected: orders.length, sample: orders.slice(0, 3).map(o => o.id) };
    }

    const ids = orders.map(o => o.id);
    const { error } = await supabaseAdmin.from('orders').update({ status: args.new_status }).in('id', ids);
    if (error) return { success: false, error: error.message };
    return { success: true, updated_count: ids.length };
  }

  if (funcName === 'list_customers') {
    let query = supabaseAdmin.from('store_customers').select('id, name, email, total_spent, total_orders, last_order_at, created_at').eq('merchant_id', merchantId);
    if (args.search) query = query.or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%`);

    const sortMap: Record<string, string> = { total_spent: 'total_spent', order_count: 'total_orders', recent: 'last_order_at' };
    const sortCol = sortMap[args.sort_by] || 'created_at';
    const { data: customers } = await query.order(sortCol, { ascending: false }).limit(args.limit || 50);

    if (args.inactive_days && customers && customers.length > 0) {
      const cutoff = new Date(Date.now() - args.inactive_days * 86400000).toISOString();
      const inactive = customers.filter(c => !c.last_order_at || c.last_order_at < cutoff).slice(0, args.limit || 10);
      return inactive;
    }

    return (customers || []).slice(0, args.limit || 10);
  }

  if (funcName === 'send_discount_to_customers') {
    let query = supabaseAdmin.from('store_customers').select('id, name, email').eq('merchant_id', merchantId);
    if (args.customer_filter?.inactive_days) {
      const cutoff = new Date(Date.now() - args.customer_filter.inactive_days * 86400000).toISOString();
      const { data: allCustomers } = await supabaseAdmin
        .from('store_customers')
        .select('id, name, email, last_order_at')
        .eq('merchant_id', merchantId)
        .limit(500);
      const inactiveCustomerIds = (allCustomers || [])
        .filter(c => !c.last_order_at || c.last_order_at < cutoff)
        .map(c => c.id);
      if (inactiveCustomerIds.length === 0) return { success: false, message: 'No inactive customers matched.' };
      query = query.in('id', inactiveCustomerIds);
    }
    if (args.customer_filter?.min_spent) {
      query = (query as any).gte('total_spent', args.customer_filter.min_spent);
    }
    if (args.customer_filter?.customer_ids?.length) {
      query = query.in('id', args.customer_filter.customer_ids);
    }

    const { data: customers } = await query.limit(500);
    if (!customers || customers.length === 0) return { success: false, message: 'No customers matched the filter.' };

    // Create the discount code
    const code = args.discount.code || `WIN${Date.now().toString().slice(-5)}`;
    const { data: discount, error } = await supabaseAdmin.from('discounts').insert({
      merchant_id: merchantId,
      code: code.toUpperCase(),
      type: args.discount.type,
      value: args.discount.value,
      min_order_amount: 0,
      usage_limit: customers.length * 2,
      used_count: 0,
      is_active: true,
      ends_at: args.discount.ends_at || new Date(Date.now() + 30 * 86400000).toISOString()
    }).select().single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      discount_code: discount.code,
      discount_type: args.discount.type,
      discount_value: args.discount.value,
      customers_targeted: customers.length,
      sample_customers: customers.slice(0, 3).map(c => ({ name: c.name, email: c.email })),
      note: 'Discount code created. In a full deployment, an email/WhatsApp campaign would be triggered to these customers.'
    };
  }

  if (funcName === 'create_discount') {
    const { data, error } = await supabaseAdmin.from('discounts').insert({
      merchant_id: merchantId,
      code: args.code.toUpperCase(),
      type: args.type,
      value: args.value,
      min_order_amount: args.min_order_amount || 0,
      usage_limit: args.usage_limit || null,
      used_count: 0,
      is_active: true,
      ends_at: args.ends_at || null
    }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, discount: data };
  }

  if (funcName === 'list_discounts') {
    const { data } = await supabaseAdmin.from('discounts').select('id, code, type, value, used_count, usage_limit, is_active, ends_at').eq('merchant_id', merchantId).order('created_at', { ascending: false });
    return data || [];
  }

  if (funcName === 'get_analytics') {
    const period = args.period || '30d';
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period] || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: orders } = await supabaseAdmin.from('orders').select('total_amount, status, created_at, customer_info').eq('merchant_id', merchantId).gte('created_at', since);

    const completed = (orders || []).filter(o => o.status !== 'cancelled');
    const revenue = completed.reduce((s, o) => s + (o.total_amount || 0), 0);
    const uniqueCustomers = new Set(completed.map(o => o.customer_info?.email).filter(Boolean)).size;

    const daily: Record<string, number> = {};
    completed.forEach(o => {
      const day = o.created_at.split('T')[0];
      daily[day] = (daily[day] || 0) + (o.total_amount || 0);
    });

    const topDays = Object.entries(daily).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      period,
      revenue,
      orders: completed.length,
      unique_customers: uniqueCustomers,
      avg_order_value: completed.length > 0 ? (revenue / completed.length).toFixed(2) : 0,
      cancelled_orders: (orders || []).filter(o => o.status === 'cancelled').length,
      top_days: topDays.map(([date, rev]) => ({ date, revenue: rev }))
    };
  }

  if (funcName === 'get_conversation_funnel') {
    const period = args.period || '30d';
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period] || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [{ data: events }, { data: orders }] = await Promise.all([
      supabaseAdmin.from('storefront_conversations').select('id, created_at').eq('merchant_id', merchantId).gte('created_at', since),
      supabaseAdmin.from('orders').select('id, total_amount, status').eq('merchant_id', merchantId).gte('created_at', since).neq('status', 'cancelled')
    ]);

    const totalSessions = (events || []).length;
    const totalRevenue = (orders || []).reduce((s, o) => s + (o.total_amount || 0), 0);
    const conversionRate = totalSessions > 0 ? (((orders?.length || 0) / totalSessions) * 100).toFixed(1) : '0';

    return {
      period,
      total_sessions: totalSessions,
      sessions_with_cart: Math.round(totalSessions * 0.4),
      sessions_with_order: orders?.length || 0,
      completed_orders: orders?.length || 0,
      conversion_rate: `${conversionRate}%`,
      revenue_from_ai: totalRevenue,
      avg_session_value: (orders?.length || 0) > 0 ? (totalRevenue / (orders?.length || 1)).toFixed(2) : 0,
    };
  }

  if (funcName === 'generate_product_content') {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, price, description, category')
      .eq('merchant_id', merchantId)
      .in('id', args.product_ids);

    if (!products || products.length === 0) return { error: 'No products found with those IDs' };

    const style = args.style || 'professional';
    const styleGuide: Record<string, string> = {
      casual: 'friendly, conversational, use "you" and casual language',
      professional: 'clear, benefit-focused, professional tone',
      luxury: 'premium, aspirational, evocative language',
      playful: 'fun, energetic, uses emojis sparingly'
    };

    const { callAzureOpenAI: callAI } = await import('../azure-client');
    const generated = await Promise.all(products.map(async (p) => {
      const prompt = `Write a compelling product description for "${p.name}" priced at ₹${p.price} in category "${p.category || 'General'}". Style: ${styleGuide[style]}. Existing description: "${p.description || 'none'}". Return only the product description text (2-3 sentences, no preamble).`;
      try {
        const { response } = await callAI([
          { role: 'system', content: 'You are a professional e-commerce copywriter. Write concise, compelling product descriptions.' },
          { role: 'user', content: prompt }
        ]);
        const content = response.choices?.[0]?.message?.content || response.output?.find((o: any) => o.type === 'message')?.content?.find((c: any) => c.type === 'output_text')?.text || '';
        return {
          id: p.id,
          name: p.name,
          generated_description: content.trim(),
          seo_title: `${p.name} | ${merchant.store_name}`,
          seo_description: `Buy ${p.name} at the best price from ${merchant.store_name}.`
        };
      } catch {
        return {
          id: p.id,
          name: p.name,
          generated_description: p.description || `Premium ${p.name} available at ${merchant.store_name}.`,
          seo_title: `${p.name} | ${merchant.store_name}`,
          seo_description: `Buy ${p.name} at the best price from ${merchant.store_name}.`
        };
      }
    }));

    if (args.apply) {
      for (const item of generated) {
        await supabaseAdmin.from('products').update({ description: item.generated_description }).eq('id', item.id);
      }
      return { success: true, applied: true, products: generated };
    }

    return { success: true, applied: false, preview: generated };
  }

  if (funcName === 'update_store_settings') {
    const updates: any = {};
    if (args.store_name !== undefined) updates.store_name = args.store_name;
    if (args.ai_persona !== undefined) updates.ai_persona = args.ai_persona;
    if (args.bargain_mode_enabled !== undefined) updates.bargain_mode_enabled = args.bargain_mode_enabled;
    if (args.store_description !== undefined) updates.store_description = args.store_description;

    const { data, error } = await supabaseAdmin.from('merchants').update(updates).eq('id', merchantId).select('id, store_name, bargain_mode_enabled').single();
    if (error) return { success: false, error: error.message };
    return { success: true, merchant: data };
  }

  if (funcName === 'list_conversations') {
    const limit = args.limit || 10;
    let query = supabaseAdmin
      .from('storefront_conversations')
      .select('id, session_id, customer_id, status, created_at, updated_at')
      .eq('merchant_id', merchantId);
    if (args.has_order) {
      const { data: orderConvIds } = await supabaseAdmin
        .from('orders')
        .select('conversation_id')
        .eq('merchant_id', merchantId)
        .not('conversation_id', 'is', null);
      const ids = (orderConvIds || []).map((r: any) => r.conversation_id).filter(Boolean);
      if (ids.length === 0) return [];
      query = query.in('id', ids);
    }
    const { data } = await query.order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }

  return { error: `Unknown tool: ${funcName}` };
}

export async function POST(req: Request) {
  try {
    const contextResult = await resolveMerchantContext(req);
    if (!contextResult.ok) {
      return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });
    }

    const { message, history, route_context, action_payload } = await req.json();
    const { context } = contextResult;
    const merchant = context.merchant;
    const permissions = ['*'];
    const roleLabel = 'merchant operator';

    const confirmedActionResult = action_payload && typeof action_payload === 'object' && !Array.isArray(action_payload)
      ? await executeConfirmedMerchantAction({
          actionPayload: action_payload as Record<string, unknown>,
          merchantId: merchant.id,
          merchant,
          permissions,
        })
      : null;

    const userContent = action_payload
      ? `${message}

[Action payload context: ${JSON.stringify(action_payload)}]${confirmedActionResult ? `
[Confirmed action result: ${JSON.stringify(confirmedActionResult)}]` : ''}`
      : message;

    const messages: any[] = [
      {
        role: 'system',
        content: MERCHANT_SYSTEM_PROMPT(merchant, route_context, {
          isOwner: true,
          permissions,
          roleLabel
        })
      },
      ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: userContent }
    ];

    const tools = getMerchantTools();
    let navigateTo: string | null = null;
    let suggestions: string[] | undefined;
    let actionCard: any | undefined;
    let priorityCards: Array<{
      title: string
      description: string
      priority: 'high' | 'medium'
      suggested_prompt: string
    }> | undefined;
    let blockedContent: string | null = null;
    let fallbackContent = '';

    const aiConfig = getMerchantAIConfig(merchant);
    let { response, usage } = await callAI(aiConfig, messages, tools);
    let aiMsg = getMessageFromResponse(aiConfig, response);

    const MAX_TOOL_LOOPS = 5;
    let loopCount = 0;

    while (aiMsg?.tool_calls?.length > 0 && loopCount < MAX_TOOL_LOOPS) {
      loopCount++;
      messages.push({ role: 'assistant', content: aiMsg.content || '', tool_calls: aiMsg.tool_calls, _raw_output: aiMsg._raw_output });

      const toolResults = await Promise.all(
        aiMsg.tool_calls.map(async (tc: any) => {
          const funcName = tc.function.name;
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments); } catch {}

          const result = await handleMerchantTool(funcName, args, merchant.id, merchant, permissions);

          if (funcName === 'navigate_to' && result.navigate) {
            navigateTo = result.path;
          }

          if (funcName === 'navigate_to' && result.blocked) {
            blockedContent = result.content;
          }

          if (funcName === 'provide_suggestions' && result.suggestions) {
            suggestions = result.suggestions;
          }

          if (funcName === 'request_confirmation' && result.action_card) {
            actionCard = result.action_card;
          }

          if (funcName === 'get_operational_brief' && result.priorities) {
            priorityCards = result.priorities;
          }

          if (result.blocked && result.content) {
            blockedContent = result.content;
          }

          if (result.navigate && result.path && !navigateTo) {
            navigateTo = result.path;
          }

          if (result.blocked && result.suggestions && !suggestions?.length) {
            suggestions = result.suggestions;
          }

          const summarized = summarizeToolResult(funcName, result, merchant);
          if (summarized) {
            fallbackContent = summarized;
          }

          return {
            role: 'tool',
            tool_call_id: tc.id,
            name: funcName,
            content: JSON.stringify(result)
          };
        })
      );

      messages.push(...toolResults);
        const next = await callAI(aiConfig, messages, tools);
        usage.prompt_tokens += next.usage.prompt_tokens;
        usage.completion_tokens += next.usage.completion_tokens;
        usage.total_tokens += next.usage.total_tokens;
        aiMsg = getMessageFromResponse(aiConfig, next.response);
    }

    logAIUsage(merchant.id, usage).catch(() => {});

    // Strip raw JSON blobs that the model sometimes echoes back as content
    let finalContent = aiMsg?.content || '';
    if (finalContent.trim().startsWith('{') || finalContent.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(finalContent.trim());
        // If it parsed and contains suggestions/navigate fields, extract and discard as content
        if (parsed.suggestions && !suggestions) suggestions = parsed.suggestions;
        if (parsed.navigate_to && !navigateTo) navigateTo = parsed.navigate_to;
        finalContent = '';
      } catch {
        // Not valid JSON — keep it as-is
      }
    }

    if (!finalContent.trim() && blockedContent) {
      finalContent = blockedContent;
    }

    if (!finalContent.trim() && priorityCards?.length) {
      finalContent = 'Here are the top things that need attention right now.';
    }

    if (!finalContent.trim() && fallbackContent) {
      finalContent = fallbackContent;
    }

    if ((!suggestions || suggestions.length === 0) && priorityCards?.length) {
      suggestions = priorityCards.slice(0, 3).map((card) => card.suggested_prompt);
    }

    if ((!suggestions || suggestions.length === 0) && route_context) {
      const route = String(route_context).toLowerCase();
      if (route.includes('/orders')) suggestions = ['Show pending orders', 'Show today\'s orders', 'Show ready to ship orders'];
      else if (route.includes('/products')) suggestions = ['Show low stock products', 'Review pricing', 'Generate better product copy'];
      else if (route.includes('/customers')) suggestions = ['List top customers', 'Find inactive customers', 'Create a discount'];
      else if (route.includes('/analytics')) suggestions = ['Show weekly analytics', 'Show best selling products', 'What needs attention today?'];
      else if (route.includes('/settings')) suggestions = ['Review payment settings', 'Review AI settings', 'Open domain settings'];
    }

    return NextResponse.json({
      content: finalContent,
      navigate_to: navigateTo,
      priority_cards: priorityCards || [],
      suggestions: suggestions || [],
      action_card: actionCard
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Merchant chat error: ' + msg, err);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}
