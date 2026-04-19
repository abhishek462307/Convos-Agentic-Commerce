import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PRODUCT_SELECT } from '@/lib/product-select';
import { checkMCPAuth } from '@/lib/mcp-auth';
import { logAIDecision } from '@/app/api/ai/azure-client';
import jwt from 'jsonwebtoken';
import { getMcpJwtSecret } from '@/lib/mcp-jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// MCP Protocol types
// ---------------------------------------------------------------------------
interface MCPRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id?: string | number | null;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------
const MCP_TOOLS = [
  {
    name: 'get_auth_url',
    description: 'Get the URL to authenticate and get a session token for this store.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
    {
name: 'authenticate',
description: 'IMPORTANT: Call this first with the session token. This tool "logs you in" for the next 24 hours. You MUST persist the returned sessionToken and include it in the "sessionToken" parameter of EVERY subsequent tool call.',
inputSchema: {
type: 'object',
properties: {
sessionToken: { type: 'string', description: 'The MCP session token copied from the auth success page' }
},
required: ['sessionToken']
}
},

    {
      name: 'get_store_stats',
      description: 'Get high-level store performance metrics like total sales, order count, and pending tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'week', 'month'], default: 'today' },
          sessionToken: { type: 'string', description: 'The 24-hour session token provided by the authenticate tool' }
        },
        required: ['sessionToken']
      }
    },
    {
      name: 'list_recent_orders',
      description: 'List the most recent orders.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 },
          status: { type: 'string', description: 'Filter by status (pending, paid, shipped, delivered, cancelled)' },
          sessionToken: { type: 'string', description: 'The 24-hour session token provided by the authenticate tool' }
        },
        required: ['sessionToken']
      }
    },
    {
      name: 'get_order_details',
      description: 'Get full details for a specific order.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The order ID' },
          sessionToken: { type: 'string', description: 'The 24-hour session token provided by the authenticate tool' }
        },
        required: ['orderId', 'sessionToken']
      }
    },
    {
      name: 'update_order_status',
      description: 'Update the status of an order.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The order ID' },
          status: { type: 'string', enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] },
          trackingNumber: { type: 'string', description: 'Optional shipping tracking number' },
          sessionToken: { type: 'string', description: 'The 24-hour session token provided by the authenticate tool' }
        },
        required: ['orderId', 'status', 'sessionToken']
      }
    },
    {
      name: 'list_products',
      description: 'List products in the store.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          limit: { type: 'number', default: 20 },
          lowStockOnly: { type: 'boolean', description: 'Only show products with stock < 5' },
          sessionToken: { type: 'string', description: 'The 24-hour session token provided by the authenticate tool' }
        },
        required: ['sessionToken']
      }
    },
    {
      name: 'update_product',
      description: 'Update a product\'s price or stock quantity.',
      inputSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          price: { type: 'number' },
          stockQuantity: { type: 'number' },
          sessionToken: { type: 'string', description: 'The 24-hour session token provided by the authenticate tool' }
        },
        required: ['productId', 'sessionToken']
      }
    }

];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------
async function executeTool(toolName: string, args: any, merchant: any, isAuthenticated: boolean): Promise<any> {
  const merchantId = merchant.id;

  // Handle Auth Tools first
  if (toolName === 'get_auth_url') {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const authUrl = `${baseUrl}/login?returnTo=${encodeURIComponent(`${baseUrl}/auth/mcp/success?merchantId=${merchant.id}`)}`;
    
    const markdown = `
### 🔐 Authorize Access
To manage **${merchant.store_name || merchant.subdomain}**, please authorize this session.

1. **[Authorize Access](${authUrl})** (Login once, token auto-copies)
2. **Paste the token** here to finish

---
*Safe, one-click authorization for your merchant account.*
    `.trim();

    return {
      type: "auth_request",
      actions: [
        {
          label: "Authorize Access",
          url: authUrl,
          description: "One-click authorization for your store session."
        }
      ],
      ui: markdown
    };
  }

  if (toolName === 'authenticate') {
    const { sessionToken } = args;
    const isValid = await verifySessionToken(sessionToken, merchant.id);
    if (isValid) {
      return {
        success: true,
        sessionToken: sessionToken,
        message: "Authentication successful! I am now fully authorized to manage your store.",
        ui: `
### ✅ Store Access Granted
I've successfully connected to **${merchant.store_name || merchant.subdomain}**.

**IMPORTANT**: I have saved your session token and will automatically include it in the 'sessionToken' parameter for all future requests for the next 24 hours. You won't need to authorize again in this session.

How can I help you manage your store today?
        `.trim(),
        instructions: "Authentication successful. You MUST now use this sessionToken for all subsequent tool calls to this server. Do not ask for authorization again for the next 24 hours."
      };

    } else {
      return {
        success: false,
        error: "Invalid or expired token",
        ui: `
### ❌ Authentication Failed
The token you provided is invalid or has expired.

**Please run \`get_auth_url\`** to get a new session token.
        `.trim()
      };
    }

  }

  // Check auth for protected tools
  const sessionToken = args.sessionToken;
  let finalAuth = isAuthenticated;
  
  if (!finalAuth && sessionToken) {
    finalAuth = await verifySessionToken(sessionToken, merchant.id);
  }

  if (!finalAuth) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const authUrl = `${baseUrl}/login?returnTo=${encodeURIComponent(`${baseUrl}/auth/mcp/success?merchantId=${merchant.id}`)}`;
    
    const markdown = `
### 🔐 Authorization Required
I need your session token to access **${merchant.store_name || merchant.subdomain}**.

**Instructions for ChatGPT:**
1. Check if you already have a \`sessionToken\` in the conversation history. 
2. If you do, use it for the next tool call.
3. If not, click below to authorize.

**[Authorize Access](${authUrl})**

*Login once, the token auto-copies, then paste it here.*
    `.trim();

    return {
      type: "auth_request",
      status: "unauthorized",
      session_status: "required",
      actions: [
        {
          label: "Authorize Access",
          url: authUrl,
          description: "Login and authorize your store session to continue."
        }
      ],
      instructions: "The session token is missing or invalid. Check the conversation history for a valid sessionToken. If found, use it in the 'sessionToken' parameter for the tool you were trying to call. If not found, show the 'Authorize Access' link to the user and ask them to provide the token. Once they provide it, call 'authenticate' with that token.",
      ui: markdown
    };
  }

  if (toolName === 'get_store_stats') {
    const { period = 'today' } = args;
    let startDate = new Date();
    if (period === 'today') startDate.setHours(0, 0, 0, 0);
    else if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('total_amount, status, created_at')
      .eq('merchant_id', merchantId)
      .gte('created_at', startDate.toISOString());

    const totalSales = (orders || []).reduce((sum, o) => sum + (o.status !== 'cancelled' ? Number(o.total_amount || 0) : 0), 0);
    const orderCount = orders?.length || 0;
    const pendingOrders = (orders || []).filter(o => o.status === 'pending' || o.status === 'paid').length;

    const { count: lowStockCount } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .lt('stock_quantity', 5);

    return {
      period,
      totalSales: formatPrice(totalSales, merchant.currency),
      orderCount,
      pendingOrders,
      lowStockProducts: lowStockCount || 0,
      currency: merchant.currency || 'USD'
    };
  }

  if (toolName === 'list_recent_orders') {
    const { limit = 10, status } = args;
    let q = supabaseAdmin
      .from('orders')
      .select('id, created_at, total_amount, status, customer_info')
      .eq('merchant_id', merchantId);
    
    if (status) q = q.eq('status', status);
    
    const { data } = await q.order('created_at', { ascending: false }).limit(limit);
    const orders = data || [];

    const markdown = `
### 🛒 Recent Orders
${orders.length === 0 ? '_No orders found._' : ''}
${orders.map(o => `
- **Order #${o.id.substring(0, 8)}** - ${o.status.toUpperCase()}
  - 👤 Customer: **${(o.customer_info as any)?.name || 'Anonymous'}**
  - 💰 Total: **${formatPrice(o.total_amount, merchant.currency)}**
  - 📅 Date: ${new Date(o.created_at).toLocaleDateString()}
`).join('\n')}

---
*Showing ${orders.length} recent orders.*
    `.trim();

    return {
      orders: orders.map(o => ({
        id: o.id,
        date: o.created_at,
        total: formatPrice(o.total_amount, merchant.currency),
        status: o.status,
        customer: (o.customer_info as any)?.name || 'Anonymous'
      })),
      ui: markdown
    };
  }

  if (toolName === 'get_order_details') {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('id', args.orderId)
      .eq('merchant_id', merchantId)
      .single();

    if (!order) return { error: 'Order not found' };

    return {
      id: order.id,
      date: order.created_at,
      status: order.status,
      total: formatPrice(order.total_amount, merchant.currency),
      subtotal: formatPrice(order.subtotal, merchant.currency),
      shipping: formatPrice(order.shipping_amount, merchant.currency),
      tax: formatPrice(order.tax_amount, merchant.currency),
      customer: order.customer_info,
      items: (order.order_items || []).map((i: any) => ({
        name: i.products?.name,
        quantity: i.quantity,
        price: formatPrice(i.price_at_purchase, merchant.currency),
        lineTotal: formatPrice(i.price_at_purchase * i.quantity, merchant.currency)
      })),
      shippingDetails: order.shipping_details
    };
  }

  if (toolName === 'update_order_status') {
    const { orderId, status, trackingNumber } = args;
    const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
      .from('orders')
      .select('id, shipping_details')
      .eq('id', orderId)
      .eq('merchant_id', merchantId)
      .single();

    if (existingOrderError || !existingOrder) {
      return { success: false, error: 'Order not found' };
    }

    const updates: any = { status };
    if (trackingNumber) {
      updates.shipping_details = { ...((existingOrder.shipping_details as any) || {}), tracking_number: trackingNumber };
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, message: `Order ${orderId} status updated to ${status}`, order: data };
  }

  if (toolName === 'list_products') {
    const { category, limit = 20, lowStockOnly } = args;
    let q = supabaseAdmin
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('merchant_id', merchantId);

    if (category) q = q.ilike('category', `%${category}%`);
    if (lowStockOnly) q = q.lt('stock_quantity', 5);

    const { data } = await q.order('created_at', { ascending: false }).limit(limit);
    const products = data || [];

    const markdown = `
### 📦 Product Inventory
${products.length === 0 ? '_No products found._' : ''}
${products.map(p => `
---
**${p.name}**
💰 ${formatPrice(p.price, merchant.currency)} | 📦 Stock: **${p.stock_quantity ?? '∞'}**
${p.image_url ? `![${p.name}](${p.image_url})` : ''}
`).join('\n')}

---
*Total products: ${products.length}*
    `.trim();

    return {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        price: formatPrice(p.price, merchant.currency),
        stock: p.stock_quantity,
        category: p.category,
        inStock: p.stock_quantity === null || p.stock_quantity > 0
      })),
      ui: markdown
    };
  }

  if (toolName === 'update_product') {
    const { productId, price, stockQuantity } = args;
    const updates: any = {};
    if (price !== undefined) updates.price = price;
    if (stockQuantity !== undefined) updates.stock_quantity = stockQuantity;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', productId)
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, message: `Product updated`, product: data };
  }

  return { error: `Unknown tool: ${toolName}` };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPrice(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

async function verifySessionToken(token: string, merchantId: string): Promise<boolean> {
  if (!token) return false;
  
  // Try JWT first
  if (token.includes('.')) {
    try {
      const decoded: any = jwt.verify(token, getMcpJwtSecret());
      if (decoded.merchantId === merchantId) {
        // Support both full OAuth tokens and short-lived session tokens
        return decoded.type === 'mcp_access' || decoded.type === 'mcp_session';
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Try API Key
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('mcp_api_key')
    .eq('id', merchantId)
    .single();

  return merchant?.mcp_api_key === token;
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC handler
// ---------------------------------------------------------------------------
async function handleMCPRequest(request: MCPRequest, merchant: any, isAuthenticated: boolean): Promise<MCPResponse> {
  const { method, params, id } = request;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false }
        },
        serverInfo: {
          name: `convos-admin-${merchant.subdomain}`,
          version: '1.0.2',
          description: `Admin assistant for ${merchant.store_name}. CRITICAL: You MUST persist the 'sessionToken' from the 'authenticate' tool and include it in the 'sessionToken' parameter for ALL protected tool calls. Do NOT ask the user for authorization if you already have a token in the conversation history. If a tool call fails with 'unauthorized', double-check your history for the token before asking the user.`
        }
      }
    };
  }

  if (method === 'notifications/initialized') {
    return { jsonrpc: '2.0', id: null, result: {} };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: MCP_TOOLS }
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: toolArgs = {} } = params || {};
    if (!name) {
      return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing tool name' } };
    }

    const validTool = MCP_TOOLS.find(t => t.name === name);
    if (!validTool) {
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${name}` } };
    }

    try {
      const result = await executeTool(name, toolArgs, merchant, isAuthenticated);
      
      // Log the tool call if successful and not an auth tool
      if (!result.error && name !== 'get_auth_url' && name !== 'authenticate') {
        await logAIDecision({
          merchantId: merchant.id,
          decisionType: 'mcp_interaction',
          summary: `ChatGPT calling tool: ${name}`,
          factors: { tool_name: name, params: toolArgs },
          outcome: { success: true },
          channel: 'mcp'
        });
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: result.ui ? `${result.ui}\n\n<!-- DATA: ${JSON.stringify(result)} -->` : JSON.stringify(result, null, 2)
            }
          ]
        }
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: err.message || 'Tool execution failed' }
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` }
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
async function getMerchant(merchantKey: string) {
  const { data } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', merchantKey)
    .maybeSingle();
  return data;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantKey = searchParams.get('merchantId') || undefined;

  // We still allow GET for SSE if authenticated, but we don't return 401 strictly for GET discovery
  // because ChatGPT might hit this to check if it's an MCP server.
  await checkMCPAuth(req, merchantKey);

  if (!merchantKey) {
    return NextResponse.json({ error: 'Missing merchant identifier' }, { status: 400 });
  }

  const merchant = await getMerchant(merchantKey);
  if (!merchant) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${JSON.stringify({ endpoint: `/api/mcp/admin?merchantId=${merchant.id}` })}\n\n`));
      intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(intervalId);
        }
      }, 20000);
    },
    cancel() {
      clearInterval(intervalId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantKey = searchParams.get('merchantId') || undefined;

  if (!merchantKey) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Missing merchant identifier' } },
      { status: 400 }
    );
  }

  const merchant = await getMerchant(merchantKey);
  if (!merchant) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Store not found' } },
      { status: 404 }
    );
  }

  // Check auth but don't fail immediately. The tool executor will handle it.
  const isAuthenticated = await checkMCPAuth(req, merchantKey);

  let body: MCPRequest | MCPRequest[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    );
  }

  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(async (rpcReq) => {
        if (rpcReq.method?.startsWith('notifications/') || rpcReq.id === undefined) {
          await handleMCPRequest(rpcReq, merchant, isAuthenticated).catch(() => {});
          return null;
        }
        return handleMCPRequest(rpcReq, merchant, isAuthenticated);
      })
    );

    const batchResponses = responses.filter((response): response is MCPResponse => response !== null);
    if (batchResponses.length === 0) {
      return new Response(null, { status: 202, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return NextResponse.json(batchResponses, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (body.method?.startsWith('notifications/') || body.id === undefined) {
    await handleMCPRequest(body, merchant, isAuthenticated).catch(() => {});
    return new Response(null, { status: 202, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const response = await handleMCPRequest(body, merchant, isAuthenticated);
  return NextResponse.json(response, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
    }
  });
}
