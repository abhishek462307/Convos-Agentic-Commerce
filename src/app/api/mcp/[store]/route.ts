import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { semanticSearch } from '@/lib/embeddings';
import { PRODUCT_SELECT } from '@/lib/product-select';
import { checkMCPAuth } from '@/lib/mcp-auth';
import Stripe from 'stripe';

type CheckoutLineItem = {
  price_data: {
    currency: string
    product_data: {
      name: string
      images?: string[]
    }
    unit_amount: number
  }
  quantity: number
};

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
// In-memory session cart store (per session_id)
// ---------------------------------------------------------------------------
const sessionCarts = new Map<string, { items: CartItem[]; subdomain: string; createdAt: number }>();

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

function getCart(sessionId: string, subdomain: string): CartItem[] {
  const session = sessionCarts.get(sessionId);
  if (!session || session.subdomain !== subdomain) {
    sessionCarts.set(sessionId, { items: [], subdomain, createdAt: Date.now() });
    return [];
  }
  return session.items;
}

function setCart(sessionId: string, subdomain: string, items: CartItem[]) {
  sessionCarts.set(sessionId, { items, subdomain, createdAt: Date.now() });
  // Clean up sessions older than 2 hours
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [key, val] of sessionCarts.entries()) {
    if (val.createdAt < cutoff) sessionCarts.delete(key);
  }
}

// ---------------------------------------------------------------------------
// MCP Tool definitions
// ---------------------------------------------------------------------------
const MCP_TOOLS = [
  {
    name: 'search_products',
    description: 'Search for products in this store by name, category, or description. Use this to find items the user wants to buy.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords (e.g. "blue sneakers", "organic coffee")' },
        category: { type: 'string', description: 'Filter by category name (optional)' },
        minPrice: { type: 'number', description: 'Minimum price filter (optional)' },
        maxPrice: { type: 'number', description: 'Maximum price filter (optional)' },
        inStockOnly: { type: 'boolean', description: 'Only return in-stock products (default: true)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_popular_products',
    description: 'Get featured/popular products from the store. Use this when browsing or when the user asks "what do you have?" or "show me products".',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
        limit: { type: 'number', description: 'Number of products to return (default 8, max 20)' }
      }
    }
  },
  {
    name: 'get_product_details',
    description: 'Get full details for a specific product including description, price, stock, and images.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The product ID' }
      },
      required: ['productId']
    }
  },
  {
    name: 'add_to_cart',
    description: 'Add a product to the shopping cart. Always confirm the product exists and is in stock first.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The product ID to add' },
        quantity: { type: 'number', description: 'Quantity to add (default 1)' },
        sessionId: { type: 'string', description: 'Session ID to track the cart (use a consistent ID per conversation)' }
      },
      required: ['productId', 'sessionId']
    }
  },
  {
    name: 'remove_from_cart',
    description: 'Remove a product from the shopping cart.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The product ID to remove' },
        sessionId: { type: 'string', description: 'Session ID for the cart' }
      },
      required: ['productId', 'sessionId']
    }
  },
  {
    name: 'view_cart',
    description: 'View the current contents of the shopping cart with prices and totals.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID for the cart' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'generate_checkout_link',
    description: 'Generate a Stripe payment/checkout link for the current cart. Use this when the user is ready to purchase. Requires customer email and shipping address.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID for the cart' },
        customerEmail: { type: 'string', description: 'Customer email address (required for checkout)' },
        customerName: { type: 'string', description: 'Customer full name' },
        address: { type: 'string', description: 'Street address' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State/Province' },
        pincode: { type: 'string', description: 'ZIP/Postal code' },
        country: { type: 'string', description: 'Country code (e.g. "US", "IN")' }
      },
      required: ['sessionId', 'customerEmail']
    }
  },
  {
    name: 'get_store_info',
    description: 'Get information about this store including name, description, and available categories.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------
async function executeTool(toolName: string, args: any, merchant: any): Promise<any> {
  const subdomain = merchant.subdomain;

  if (toolName === 'get_store_info') {
    const { data: categories } = await supabase
      .from('products')
      .select('category')
      .eq('merchant_id', merchant.id)
      .gt('stock_quantity', 0);

    const uniqueCategories = [...new Set((categories || []).map((p: any) => p.category).filter(Boolean))];
    return {
      name: merchant.store_name,
      description: merchant.store_description || `Welcome to ${merchant.store_name}`,
      categories: uniqueCategories,
      currency: merchant.currency || 'USD',
      bargainEnabled: merchant.bargain_mode_enabled || false,
      storeUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}`
    };
  }

  if (toolName === 'search_products') {
    const { query, category, minPrice, maxPrice, inStockOnly = true } = args;
    const genericTerms = ['all', 'everything', 'anything', 'products', 'store', 'shop', 'show', 'browse'];
    const isGeneric = genericTerms.some(t => (query || '').toLowerCase().includes(t));

    let results: any[];
    if (!query || isGeneric) {
      let q = supabase.from('products').select(PRODUCT_SELECT).eq('merchant_id', merchant.id);
      if (inStockOnly) q = q.gt('stock_quantity', 0);
      if (category) q = q.ilike('category', `%${category}%`);
      if (minPrice !== undefined) q = q.gte('price', minPrice);
      if (maxPrice !== undefined) q = q.lte('price', maxPrice);
      const { data } = await q.order('created_at', { ascending: false }).limit(12);
      results = data || [];
    } else {
      results = await semanticSearch(query, merchant.id, { category, minPrice, maxPrice, inStockOnly, limit: 12 });
    }

      return results.map((p) => formatProduct(p));
    }


  if (toolName === 'get_popular_products') {
    const { category, limit = 8 } = args;
    let q = supabase.from('products').select(PRODUCT_SELECT).eq('merchant_id', merchant.id).gt('stock_quantity', 0);
    if (category) q = q.ilike('category', `%${category}%`);
    const { data } = await q.order('created_at', { ascending: false }).limit(Math.min(limit, 20));
    return (data || []).map((p) => formatProduct(p));
  }

  if (toolName === 'get_product_details') {
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', args.productId)
      .eq('merchant_id', merchant.id)
      .single();

    if (!data) return { error: 'Product not found' };
    return formatProduct(data, true);
  }

  if (toolName === 'add_to_cart') {
    const { productId, quantity = 1, sessionId } = args;
    const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, image_url')
      .eq('id', productId)
      .eq('merchant_id', merchant.id)
      .single();

    if (!product) return { success: false, error: 'Product not found' };

    const cart = getCart(sessionId, subdomain);
    const existing = cart.find(i => i.productId === productId);
    const nextQuantity = (existing?.quantity || 0) + safeQuantity;
    const inStock = product.stock_quantity === null || product.stock_quantity >= nextQuantity;
    if (!inStock) return { success: false, error: `Only ${product.stock_quantity} in stock` };

    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      cart.push({
        productId,
        name: product.name,
        price: product.price,
        quantity: safeQuantity,
        image_url: product.image_url
      });
    }
    setCart(sessionId, subdomain, cart);

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      success: true,
      message: `Added ${product.name} (×${safeQuantity}) to cart`,
      cart: formatCart(cart),
      cartTotal: formatPrice(total, merchant.currency, merchant.locale)
    };
  }

  if (toolName === 'remove_from_cart') {
    const { productId, sessionId } = args;
    const cart = getCart(sessionId, subdomain);
    const updated = cart.filter(i => i.productId !== productId);
    setCart(sessionId, subdomain, updated);
    const total = updated.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      success: true,
      message: 'Item removed from cart',
      cart: formatCart(updated),
      cartTotal: formatPrice(total, merchant.currency, merchant.locale)
    };
  }

  if (toolName === 'view_cart') {
    const { sessionId } = args;
    const cart = getCart(sessionId, subdomain);
    if (cart.length === 0) return { empty: true, message: 'Cart is empty', items: [] };
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      items: formatCart(cart),
      total: formatPrice(total, merchant.currency, merchant.locale),
      itemCount: cart.reduce((s, i) => s + i.quantity, 0),
      checkoutHint: 'Use generate_checkout_link with your email and address to complete the purchase.'
    };
  }

  if (toolName === 'generate_checkout_link') {
    const { sessionId, customerEmail, customerName, address, city, state, pincode, country = 'US' } = args;
    const cart = getCart(sessionId, subdomain);

    if (cart.length === 0) return { success: false, error: 'Cart is empty. Add products first.' };
    if (!customerEmail) return { success: false, error: 'Customer email is required.' };

    const { data: merchantWithPayments } = await supabaseAdmin
      .from('merchants')
      .select('payment_methods, shipping_settings, tax_settings')
      .eq('id', merchant.id)
      .single();

    const paymentMethods = merchantWithPayments?.payment_methods || {};
    const stripeConfig = (paymentMethods as any).stripe;

    if (!stripeConfig?.enabled) {
      return { success: false, error: 'This store does not have online payments enabled.' };
    }

    const isTestMode = stripeConfig.test_mode;
    const secretKey = isTestMode ? stripeConfig.test_secret_key : stripeConfig.secret_key;
    if (!secretKey) return { success: false, error: 'Payment configuration incomplete.' };

    const productIds = [...new Set(cart.map((item) => item.productId))];
    const { data: cartProducts } = await supabaseAdmin
      .from('products')
      .select('id, name, price, stock_quantity, image_url')
      .eq('merchant_id', merchant.id)
      .in('id', productIds);

    const productMap = new Map((cartProducts || []).map((product: any) => [product.id, product]));
    const validatedCart: CartItem[] = [];
    for (const item of cart) {
      const product = productMap.get(item.productId);
      if (!product) {
        return { success: false, error: 'Cart contains products outside this store. Please re-add items.' };
      }
      if (product.stock_quantity !== null && product.stock_quantity < item.quantity) {
        return { success: false, error: `Only ${product.stock_quantity} left for ${product.name}.` };
      }
      validatedCart.push({
        ...item,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url,
      });
    }

    const currency = (merchant.currency || 'USD').toLowerCase();
    const subtotal = validatedCart.reduce((s, i) => s + i.price * i.quantity, 0);

    const shippingSettings = merchantWithPayments?.shipping_settings || { zones: [] };
    let shipping = 0;
    if ((shippingSettings as any).zones?.length > 0) {
      const zone = (shippingSettings as any).zones.find((z: any) => z.countries?.includes(country));
      if (zone?.rates?.[0]) shipping = zone.rates[0].price;
      else if ((shippingSettings as any).zones[0]?.rates?.[0]) shipping = (shippingSettings as any).zones[0].rates[0].price;
    } else {
      shipping = subtotal > 100 ? 0 : 15;
    }

    const taxSettings = merchantWithPayments?.tax_settings || {};
    let tax = 0;
    let taxRate = 0;
    let taxName = 'Tax';
    if ((taxSettings as any).enabled) {
      const countryRate = (taxSettings as any).country_rates?.find((c: any) => c.country_code === country);
      taxRate = countryRate?.rate || (taxSettings as any).default_rate || 0;
      taxName = countryRate?.tax_name || 'Tax';
      if (taxRate > 0) tax = subtotal * (taxRate / 100);
    }

    const total = subtotal + shipping + tax;

    const { data: order, error: orderError } = await supabaseAdmin.from('orders').insert([{
      merchant_id: merchant.id,
      total_amount: total,
      subtotal,
      shipping_amount: shipping,
      tax_amount: tax,
      customer_info: { name: customerName, email: customerEmail, address, city, state, pincode, country },
      status: 'pending',
      payment_method: 'stripe',
      ai_assisted: true,
      payment_details: { source: 'mcp_chatgpt' }
    }]).select().single();

    if (orderError || !order) return { success: false, error: 'Failed to create order.' };

    const orderItems = validatedCart.map(item => ({
      order_id: order.id,
      merchant_id: merchant.id,
      product_id: item.productId,
      quantity: item.quantity,
      price_at_purchase: item.price
    }));
    await supabaseAdmin.from('order_items').insert(orderItems);

    const stripeInstance = new Stripe(secretKey);
    const lineItems: CheckoutLineItem[] = validatedCart.map(item => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : undefined
        },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.quantity
    }));

    if (shipping > 0) {
      lineItems.push({ price_data: { currency, product_data: { name: 'Shipping' }, unit_amount: Math.round(shipping * 100) }, quantity: 1 });
    }
    if (tax > 0) {
      lineItems.push({ price_data: { currency, product_data: { name: `${taxName} (${taxRate}%)` }, unit_amount: Math.round(tax * 100) }, quantity: 1 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/store/${subdomain}/checkout?success=true&order_id=${order.id}`;
    const cancelUrl = `${baseUrl}/store/${subdomain}/checkout?canceled=true&order_id=${order.id}`;

    try {
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: { order_id: order.id, merchant_id: merchant.id, subdomain, source: 'mcp_chatgpt' }
      });

      // Clear the cart after checkout link is generated
      setCart(sessionId, subdomain, []);

      return {
        success: true,
        checkoutUrl: session.url,
        orderId: order.id,
        summary: {
          items: validatedCart.length,
          subtotal: formatPrice(subtotal, merchant.currency, merchant.locale),
          shipping: formatPrice(shipping, merchant.currency, merchant.locale),
          tax: tax > 0 ? formatPrice(tax, merchant.currency, merchant.locale) : null,
          total: formatPrice(total, merchant.currency, merchant.locale)
        },
        message: `Checkout ready! Click the link to complete your purchase: ${session.url}`
      };
    } catch (err: any) {
      await supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return { success: false, error: `Payment setup failed: ${err.message}` };
    }
  }

  return { error: `Unknown tool: ${toolName}` };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function formatProduct(p: any, detailed = false): any {
  const base: any = {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    inStock: p.stock_quantity === null || p.stock_quantity > 0,
    stockQuantity: p.stock_quantity,
    image: p.image_url,
    badge: p.badge
  };
  if (detailed) {
    base.description = p.description;
    base.sku = p.sku;
    base.compareAtPrice = p.compare_at_price;
    base.bargainEnabled = p.bargain_enabled;
    base.bargainMinPrice = p.bargain_min_price;
  }
  return base;
}

function formatCart(items: CartItem[]): any[] {
  return items.map(i => ({
    productId: i.productId,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    lineTotal: i.price * i.quantity
  }));
}

function formatPrice(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC handler
// ---------------------------------------------------------------------------
async function handleMCPRequest(request: MCPRequest, merchant: any): Promise<MCPResponse> {
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
          name: `convos-${merchant.subdomain}`,
          version: '1.0.0',
          description: `AI shopping assistant for ${merchant.store_name}`
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
      const result = await executeTool(name, toolArgs, merchant);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
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

  if (method === 'resources/list') {
    return { jsonrpc: '2.0', id, result: { resources: [] } };
  }

  if (method === 'prompts/list') {
    return { jsonrpc: '2.0', id, result: { prompts: [] } };
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
async function getMerchant(store: string) {
  const { data } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', store)
    .maybeSingle();
  return data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  const { store } = await params;

  if (!await checkMCPAuth(req, store)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // SSE endpoint for streaming (ChatGPT App compatibility)
  const merchant = await getMerchant(store);
  if (!merchant) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${JSON.stringify({ endpoint: `/api/mcp/${store}` })}\n\n`));

      // Keep-alive ping every 20 seconds
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  const { store } = await params;

  if (!await checkMCPAuth(req, store)) {
    return NextResponse.json({ jsonrpc: '2.0', error: { code: 401, message: 'Unauthorized' } }, { status: 401 });
  }

  const merchant = await getMerchant(store);
  if (!merchant) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Store not found' } },
      { status: 404 }
    );
  }

  let body: MCPRequest | MCPRequest[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    );
  }

  // Batch requests
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map(async (rpcReq) => {
        if (rpcReq.method?.startsWith('notifications/') || rpcReq.id === undefined) {
          await handleMCPRequest(rpcReq, merchant).catch(() => {});
          return null;
        }
        return handleMCPRequest(rpcReq, merchant);
      })
    );

    const batchResponses = responses.filter((response): response is MCPResponse => response !== null);
    if (batchResponses.length === 0) {
      return new Response(null, { status: 202, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    return NextResponse.json(batchResponses, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Single request - handle notifications (no response needed)
  if (body.method?.startsWith('notifications/') || body.id === undefined) {
    await handleMCPRequest(body, merchant).catch(() => {});
    return new Response(null, { status: 202, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const response = await handleMCPRequest(body, merchant);
  return NextResponse.json(response, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
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
