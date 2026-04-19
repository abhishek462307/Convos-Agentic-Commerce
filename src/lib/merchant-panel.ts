import { supabaseAdmin } from '@/lib/supabase-admin';
import type {
  Merchant,
  MerchantDashboardChartPoint,
  MerchantDashboardSummary,
  MerchantListPage,
} from '@/types';

function getPercentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function parsePositiveInt(value: string | null, fallback: number, max = 100) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function normalizeSearch(value: string | null) {
  return value?.trim() || '';
}

const ORDER_STATUS_VALUES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'payment_failed',
  'refunded',
] as const;

function buildDashboardTasks(merchant: Merchant, productCount: number, lowStockCount: number, currentConversations: number) {
  return [
    { id: 'product', title: 'Add products', description: 'Start selling', href: '/products', completed: productCount > 0 },
    {
      id: 'branding',
      title: 'Branding',
      description: 'Customize look',
      href: '/store-design',
      completed: Boolean((merchant.branding_settings as Record<string, unknown> | undefined)?.logo_url),
    },
    {
      id: 'ai',
      title: 'AI Agent',
      description: 'Train personality',
      href: '/settings/ai-character',
      completed: Boolean(merchant.ai_character_name || merchant.ai_custom_instructions),
    },
    {
      id: 'payments',
      title: 'Payments',
      description: 'Connect Stripe',
      href: '/settings/payments',
      completed: Boolean((merchant.payment_methods as Record<string, unknown> | undefined)?.stripe),
    },
    {
      id: 'shipping',
      title: 'Shipping',
      description: 'Set delivery zones',
      href: '/settings/shipping',
      completed: Boolean(((merchant.shipping_settings as Record<string, unknown> | undefined)?.zones as unknown[] | undefined)?.length),
    },
    {
      id: 'preview',
      title: 'Go live',
      description: 'Check your store',
      href: `/store/${merchant.subdomain}`,
      completed: currentConversations > 0 && lowStockCount >= 0,
    },
  ];
}

export async function getMerchantDashboardData(merchant: Merchant, dateRangeDays: 1 | 7 | 30): Promise<MerchantDashboardSummary> {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setHours(0, 0, 0, 0);
  periodStart.setDate(periodStart.getDate() - (dateRangeDays - 1));

  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - dateRangeDays);

  const [
    { data: orders },
    { data: recentOrders },
    { count: conversationCount },
    { count: previousConversationCount },
    { data: recentConversations },
    { count: productCount },
    { count: lowStockCount },
    { data: aiImpact },
  ] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, created_at, status, customer_info')
      .eq('merchant_id', merchant.id)
      .gte('created_at', previousPeriodStart.toISOString())
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, created_at, status, customer_info')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('storefront_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .gte('created_at', periodStart.toISOString()),
    supabaseAdmin
      .from('storefront_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', periodStart.toISOString()),
    supabaseAdmin
      .from('storefront_conversations')
      .select('id, status, created_at, session_id')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id),
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', merchant.id)
      .gt('stock_quantity', 0)
      .lt('stock_quantity', 5),
    supabaseAdmin
      .from('ai_decision_log')
      .select('decision_type, accepted, confidence, created_at')
      .eq('merchant_id', merchant.id)
      .gte('created_at', previousPeriodStart.toISOString()),
  ]);

  const allOrders = orders || [];
  const currentOrders = allOrders.filter((order) => new Date(order.created_at) >= periodStart);
  const previousOrders = allOrders.filter((order) => {
    const createdAt = new Date(order.created_at);
    return createdAt >= previousPeriodStart && createdAt < periodStart;
  });

  const chartData: MerchantDashboardChartPoint[] = Array.from({ length: dateRangeDays }, (_, index) => {
    const date = new Date(periodStart);
    date.setDate(date.getDate() + index);
    return { name: `${date.getMonth() + 1}/${date.getDate()}`, sales: 0 };
  });

  currentOrders.forEach((order) => {
    const key = `${new Date(order.created_at).getMonth() + 1}/${new Date(order.created_at).getDate()}`;
    const point = chartData.find((item) => item.name === key);
    if (point) {
      point.sales += Number(order.total_amount) || 0;
    }
  });

  const currentRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const currentOrdersCount = currentOrders.length;
  const previousOrdersCount = previousOrders.length;
  const currentConversations = conversationCount || 0;
  const previousConversations = previousConversationCount || 0;
  const currentConversionRate = currentConversations ? (currentOrdersCount / currentConversations) * 100 : 0;
  const previousConversionRate = previousConversations ? (previousOrdersCount / previousConversations) * 100 : 0;

  const aiLogs = aiImpact || [];
  const aiClosed = aiLogs.filter((log) =>
    ['checkout', 'payment_link', 'auto_checkout', 'order_created'].includes(String(log.decision_type))
  ).length;
  const avgConfidence = aiLogs.length
    ? aiLogs.reduce((sum, log) => sum + Number(log.confidence || 0), 0) / aiLogs.length
    : 0;

  return {
    stats: {
      revenue: currentRevenue,
      orders: currentOrdersCount,
      conversations: currentConversations,
      conversionRate: currentConversionRate,
    },
    trends: {
      revenue: getPercentChange(currentRevenue, previousRevenue),
      orders: getPercentChange(currentOrdersCount, previousOrdersCount),
      conversations: getPercentChange(currentConversations, previousConversations),
      conversionRate: getPercentChange(currentConversionRate, previousConversionRate),
    },
    chartData,
    recentConversations: recentConversations || [],
    recentOrders: recentOrders || [],
    productCount: productCount || 0,
    lowStockCount: lowStockCount || 0,
    setupTasks: buildDashboardTasks(merchant, productCount || 0, lowStockCount || 0, currentConversations),
    aiMetrics: {
      totalEvents: aiLogs.length,
      conversions: aiClosed,
      avgConfidence,
    },
  };
}

export async function getMerchantOrdersPage(
  merchantId: string,
  searchParams: URLSearchParams
): Promise<MerchantListPage<Record<string, unknown>> & { statusCounts: Record<string, number> }> {
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20, 100);
  const search = normalizeSearch(searchParams.get('search'));
  const status = searchParams.get('status') || 'all';
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const escapedSearch = search ? search.replace(/[%_]/g, '\\$&') : '';

  let query = supabaseAdmin
    .from('orders')
    .select('id, merchant_id, total_amount, created_at, status, customer_info', { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(
      `customer_info->>name.ilike.%${escapedSearch}%,customer_info->>email.ilike.%${escapedSearch}%`
    );
  }

  const [ordersResult, allCountResult, ...statusCountResults] = await Promise.all([
    query.range(from, to),
    (() => {
      let countQuery = supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId);

      if (search) {
        countQuery = countQuery.or(
          `customer_info->>name.ilike.%${escapedSearch}%,customer_info->>email.ilike.%${escapedSearch}%`
        );
      }

      return countQuery;
    })(),
    ...ORDER_STATUS_VALUES.map((statusValue) => {
      let countQuery = supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('status', statusValue);

      if (search) {
        countQuery = countQuery.or(
          `customer_info->>name.ilike.%${escapedSearch}%,customer_info->>email.ilike.%${escapedSearch}%`
        );
      }

      return countQuery;
    }),
  ]);

  const { data, count, error } = ordersResult;
  if (error) {
    throw error;
  }

  if (allCountResult.error) {
    throw allCountResult.error;
  }

  const statusCounts = ORDER_STATUS_VALUES.reduce<Record<string, number>>((accumulator, statusValue, index) => {
    const result = statusCountResults[index];
    if (result.error) {
      throw result.error;
    }

    accumulator[statusValue] = result.count || 0;
    return accumulator;
  }, {});

  statusCounts.all = allCountResult.count || 0;

  return {
    items: (data || []).map((order) => ({
      ...order,
      payment_method: null,
      metadata: {},
    })),
    page,
    pageSize,
    total: count || 0,
    statusCounts,
  };
}

export async function getMerchantReviewsPage(
  merchantId: string,
  searchParams: URLSearchParams
): Promise<MerchantListPage<Record<string, unknown>> & { stats: Record<string, unknown> }> {
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20, 100);
  const status = searchParams.get('status') || 'all';
  const search = normalizeSearch(searchParams.get('search'));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('product_reviews')
    .select('*, products!inner(name, merchant_id)', { count: 'exact' })
    .eq('products.merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (status === 'pending') {
    query = query.eq('is_approved', false);
  } else if (status === 'approved') {
    query = query.eq('is_approved', true);
  }

  if (search) {
    const escaped = search.replace(/[%_]/g, '\\$&');
    query = query.or(
      `customer_name.ilike.%${escaped}%,customer_email.ilike.%${escaped}%,content.ilike.%${escaped}%,title.ilike.%${escaped}%,products.name.ilike.%${escaped}%`
    );
  }

  const [{ data: items, count, error }, { data: allReviews, error: statsError }] = await Promise.all([
    query.range(from, to),
    supabaseAdmin
      .from('product_reviews')
      .select('rating, is_approved, products!inner(merchant_id)')
      .eq('products.merchant_id', merchantId),
  ]);

  if (error) {
    throw error;
  }

  if (statsError) {
    throw statsError;
  }

  const reviewStats = allReviews || [];
  return {
    items: items || [],
    page,
    pageSize,
    total: count || 0,
    stats: {
      total: reviewStats.length,
      pending: reviewStats.filter((review) => !review.is_approved).length,
      approved: reviewStats.filter((review) => review.is_approved).length,
      avgRating: reviewStats.length
        ? Number(
            (reviewStats.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewStats.length).toFixed(1)
          )
        : 0,
    },
  };
}

export async function getMerchantConversationsPage(
  merchantId: string,
  searchParams: URLSearchParams
): Promise<MerchantListPage<Record<string, unknown>>> {
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20, 100);
  const search = normalizeSearch(searchParams.get('search'));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('storefront_conversations')
    .select('*', { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (search) {
    const escaped = search.replace(/[%_]/g, '\\$&');
    query = query.or(`status.ilike.%${escaped}%,session_id.ilike.%${escaped}%`);
  }

  const { data, count, error } = await query.range(from, to);
  if (error) {
    throw error;
  }

  return {
    items: data || [],
    page,
    pageSize,
    total: count || 0,
  };
}

export async function getMerchantConversationDetail(merchantId: string, conversationId: string) {
  const { data: conversation, error: conversationError } = await supabaseAdmin
    .from('storefront_conversations')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('id', conversationId)
    .single();

  if (conversationError) {
    throw conversationError;
  }

  const messagesResult = await supabaseAdmin
    .from('storefront_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  return {
    conversation,
    messages: messagesResult.data || [],
  };
}

export async function getMerchantIntelligenceData(merchantId: string) {
  const [
    { data: activeIntents, error: intentsError },
    { data: pendingPlans, error: plansError },
    { data: allIntents, error: allIntentsError },
    { data: autoCheckoutLogs, error: logError },
    { data: negotiations, error: negotiationsError },
    { data: merchantIntentEmails, error: emailsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('customer_intents')
      .select('*, negotiation_logs(*)')
      .eq('merchant_id', merchantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('agent_plans')
      .select('*, customer_intents!inner(*)')
      .eq('customer_intents.merchant_id', merchantId)
      .eq('is_approved', false)
      .eq('status', 'planning'),
    supabaseAdmin
      .from('customer_intents')
      .select('status')
      .eq('merchant_id', merchantId),
    supabaseAdmin
      .from('ai_decision_log')
      .select('id')
      .eq('merchant_id', merchantId)
      .in('decision_type', ['checkout', 'payment_link', 'auto_checkout', 'order_created']),
    supabaseAdmin
      .from('negotiation_logs')
      .select('buyer_offer, merchant_offer, outcome, intent_id, customer_intents!inner(merchant_id)')
      .eq('customer_intents.merchant_id', merchantId)
      .eq('outcome', 'accepted'),
    supabaseAdmin
      .from('customer_intents')
      .select('consumer_email')
      .eq('merchant_id', merchantId),
  ]);

  if (intentsError || plansError || allIntentsError || logError || negotiationsError || emailsError) {
    throw intentsError || plansError || allIntentsError || logError || negotiationsError || emailsError;
  }

  const uniqueEmails = [...new Set((merchantIntentEmails || []).map((entry) => entry.consumer_email).filter(Boolean))];
  const { data: profiles, error: profilesError } = uniqueEmails.length > 0
    ? await supabaseAdmin
        .from('store_customers')
        .select('*')
        .eq('merchant_id', merchantId)
        .in('email', uniqueEmails)
        .limit(10)
    : { data: [], error: null };

  if (profilesError) {
    throw profilesError;
  }

  const activeCount = allIntents?.filter((intent) => intent.status === 'active').length || 0;
  const completedCount = allIntents?.filter((intent) => intent.status === 'completed').length || 0;
  const avgTrust = profiles?.length
    ? Math.round(profiles.reduce((sum, profile) => sum + Number(profile.total_orders || 0), 0) / profiles.length)
    : 0;
  const aiRevenue = negotiations?.reduce((sum, negotiation) => sum + Number(negotiation.merchant_offer || 0), 0) || 0;
  const uplift = negotiations?.length
    ? Math.round(
        (negotiations.reduce((sum, negotiation) => {
          const buyer = Number(negotiation.buyer_offer) || 0;
          const merchant = Number(negotiation.merchant_offer) || 0;
          return sum + (buyer > 0 ? ((merchant - buyer) / buyer) * 100 : 0);
        }, 0) / negotiations.length) * 10
      ) / 10
    : 0;
  const totalIntents = allIntents?.length || 0;
  const autoCheckoutCount = autoCheckoutLogs?.length || 0;

  return {
    stats: {
      negotiationUplift: uplift,
      intentsCompleted: completedCount,
      activeIntents: activeCount,
      aiRevenue,
      trustAvg: avgTrust,
      intentCompletionRate: totalIntents > 0 ? Math.round((completedCount / totalIntents) * 100) : 0,
      autoCheckoutRate: totalIntents > 0 ? Math.round((autoCheckoutCount / totalIntents) * 100) : 0,
    },
    profiles: profiles || [],
    activeIntents: activeIntents || [],
    pendingPlans: pendingPlans || [],
  };
}

export async function getMerchantAnalyticsData(merchantId: string, period: 'day' | 'week' | 'month') {
  const now = new Date();
  let startDate: Date;
  let previousStartDate: Date;
  let previousEndDate: Date;

  if (period === 'day') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - 1);
    previousEndDate = new Date(startDate);
  } else if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - 7);
    previousEndDate = new Date(startDate);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [{ data: currentOrders }, { data: previousOrders }, { data: visitorEvents }, { data: convEvents }, { data: products }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, created_at, payment_details, ai_assisted, ai_negotiated, ai_revenue_delta')
      .eq('merchant_id', merchantId)
      .gte('created_at', startDate.toISOString()),
    supabaseAdmin
      .from('orders')
      .select('id, total_amount, created_at, payment_details')
      .eq('merchant_id', merchantId)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', previousEndDate.toISOString()),
    supabaseAdmin
      .from('storefront_conversations')
      .select('session_id')
      .eq('merchant_id', merchantId)
      .gte('created_at', startDate.toISOString()),
    supabaseAdmin
      .from('storefront_conversations')
      .select('id')
      .eq('merchant_id', merchantId)
      .gte('created_at', startDate.toISOString()),
    supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('merchant_id', merchantId),
  ]);

  const productMap = new Map((products || []).map(p => [p.id, p.name]));
  const current = currentOrders || [];
  const previous = previousOrders || [];
  
  // Unique visitors in current period
  const visitors = new Set((visitorEvents || []).map((event: any) => event.session_id).filter(Boolean)).size || convEvents?.length || 0;
  
  const totalRevenue = current.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const totalOrders = current.length;
  const previousRevenue = previous.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const previousOrdersCount = previous.length;

  let totalDiscounts = 0;
  let totalBargainSavings = 0;
  let bargainedOrders = 0;
  let aiAssistedOrders = 0;
  let aiRevenueDelta = 0;
  let previousDiscounts = 0;
  let previousBargainSavings = 0;
  const discountUsage: Record<string, { code: string; amount: number; count: number }> = {};
  const bargainUsage: Record<string, { productName: string; totalSavings: number; count: number; avgDiscount: number }> = {};

  current.forEach((order) => {
    if (order.ai_assisted) aiAssistedOrders++;
    if (order.ai_revenue_delta) aiRevenueDelta += Number(order.ai_revenue_delta);
    
    const paymentDetails = (order.payment_details || {}) as Record<string, any>;
    if (paymentDetails.discount_amount) {
      const amount = Number(paymentDetails.discount_amount) || 0;
      totalDiscounts += amount;
      const code = paymentDetails.discount_applied || 'Unknown';
      discountUsage[code] ||= { code, amount: 0, count: 0 };
      discountUsage[code].amount += amount;
      discountUsage[code].count += 1;
    }
    if (paymentDetails.bargain_savings) {
      totalBargainSavings += Number(paymentDetails.bargain_savings) || 0;
      bargainedOrders += 1;
      const bargainedItems = Array.isArray(paymentDetails.bargained_items) ? paymentDetails.bargained_items : [];
      bargainedItems.forEach((item: any) => {
        const productId = item.product_id || 'unknown';
        bargainUsage[productId] ||= {
          productName: productMap.get(productId) || String(productId).slice(0, 8),
          totalSavings: 0,
          count: 0,
          avgDiscount: 0,
        };
        const savings = Number(item.original_price || 0) - Number(item.bargained_price || 0);
        bargainUsage[productId].totalSavings += savings;
        bargainUsage[productId].count += 1;
        bargainUsage[productId].avgDiscount = Number(item.discount_percentage || 0);
      });
    }
  });

  previous.forEach((order) => {
    const paymentDetails = (order.payment_details || {}) as Record<string, any>;
    if (paymentDetails.discount_amount) previousDiscounts += Number(paymentDetails.discount_amount) || 0;
    if (paymentDetails.bargain_savings) previousBargainSavings += Number(paymentDetails.bargain_savings) || 0;
  });

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayStats: Record<string, { revenue: number; orders: number }> = {};
  weekdays.forEach((day) => {
    weekdayStats[day] = { revenue: 0, orders: 0 };
  });
  current.forEach((order) => {
    const orderDate = new Date(order.created_at);
    const dayName = weekdays[orderDate.getDay()];
    weekdayStats[dayName].revenue += Number(order.total_amount || 0);
    weekdayStats[dayName].orders += 1;
  });
  const weekdayData = weekdays.map((day) => ({
    day: day.slice(0, 3),
    revenue: weekdayStats[day].revenue,
    orders: weekdayStats[day].orders,
  }));
  const bestWeekday = weekdayData.reduce((max, curr) => (curr.revenue > max.revenue ? curr : max), weekdayData[0] || { day: '', revenue: 0, orders: 0 });
  const bestDay = bestWeekday?.revenue > 0
    ? { day: weekdays.find((day) => day.startsWith(bestWeekday.day)) || bestWeekday.day, revenue: bestWeekday.revenue }
    : null;

  const chartData: Array<{ date: string; label: string; revenue: number; orders: number; discounts: number }> = [];
  if (period === 'day') {
    for (let hour = 0; hour < 24; hour += 1) {
      chartData.push({ date: `${hour}:00`, label: `${hour}:00`, revenue: 0, orders: 0, discounts: 0 });
    }
    current.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      chartData[hour].revenue += Number(order.total_amount || 0);
      chartData[hour].orders += 1;
      chartData[hour].discounts += Number((order.payment_details as any)?.discount_amount || 0);
    });
  } else if (period === 'week') {
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      chartData.push({
        date: day.toISOString().split('T')[0],
        label: day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: 0,
        orders: 0,
        discounts: 0,
      });
    }
    current.forEach((order) => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const point = chartData.find((item) => item.date === orderDate);
      if (point) {
        point.revenue += Number(order.total_amount || 0);
        point.orders += 1;
        point.discounts += Number((order.payment_details as any)?.discount_amount || 0);
      }
    });
  } else {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const weeksInMonth = Math.ceil(daysInMonth / 7);
    for (let i = 0; i < weeksInMonth; i += 1) {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), i * 7 + 1);
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), Math.min((i + 1) * 7, daysInMonth));
      chartData.push({
        date: `week-${i}`,
        label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { day: 'numeric' })}`,
        revenue: 0,
        orders: 0,
        discounts: 0,
      });
    }
    current.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const weekIndex = Math.floor((orderDate.getDate() - 1) / 7);
      if (chartData[weekIndex]) {
        chartData[weekIndex].revenue += Number(order.total_amount || 0);
        chartData[weekIndex].orders += 1;
        chartData[weekIndex].discounts += Number((order.payment_details as any)?.discount_amount || 0);
      }
    });
  }

  return {
    stats: {
      totalRevenue,
      totalOrders,
      totalDiscounts,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      previousRevenue,
      previousOrders: previousOrdersCount,
      previousDiscounts,
      totalBargainSavings,
      bargainedOrders,
      previousBargainSavings,
      visitors: Math.max(visitors, totalOrders),
      conversionRate: visitors > 0 ? (totalOrders / visitors) * 100 : 0,
      aiAssistedOrders,
      aiRevenueDelta,
    },
    chartData,
    topDiscounts: Object.values(discountUsage).sort((a, b) => b.amount - a.amount).slice(0, 5),
    topBargains: Object.values(bargainUsage).sort((a, b) => b.totalSavings - a.totalSavings).slice(0, 5),
    weekdayData,
    bestDay,
  };
}

export async function getMerchantCustomersPage(merchantId: string, searchParams: URLSearchParams) {
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(searchParams.get('pageSize'), 20, 100);
  const search = normalizeSearch(searchParams.get('search')).toLowerCase();

  const [{ data: storeCustomers }, { data: orders }] = await Promise.all([
    supabaseAdmin.from('store_customers').select('*').eq('merchant_id', merchantId),
    supabaseAdmin.from('orders').select('id, total_amount, created_at, customer_info').eq('merchant_id', merchantId),
  ]);

  const customerMap = new Map<string, Record<string, any>>();
  (storeCustomers || []).forEach((customer: any) => {
    if (!customer.email) return;
    customerMap.set(customer.email, {
      id: customer.id,
      email: customer.email,
      name: customer.name || 'Customer',
      ordersCount: customer.total_orders || 0,
      totalSpent: Number(customer.total_spent) || 0,
      lastOrder: customer.last_order_at || customer.created_at,
      firstOrder: customer.created_at,
      isRegistered: true,
      isVerified: customer.is_verified,
    });
  });

  (orders || []).forEach((order: any) => {
    const email = order.customer_info?.email || 'guest';
    if (!customerMap.has(email)) {
      customerMap.set(email, {
        id: order.id,
        email,
        name: order.customer_info?.name || 'Guest Customer',
        ordersCount: 0,
        totalSpent: 0,
        lastOrder: order.created_at,
        firstOrder: order.created_at,
        isRegistered: false,
      });
    }
    const customer = customerMap.get(email)!;
    if (!customer.isRegistered) {
      customer.ordersCount += 1;
      customer.totalSpent += Number(order.total_amount || 0);
      if (new Date(order.created_at) > new Date(customer.lastOrder)) {
        customer.lastOrder = order.created_at;
        customer.name = order.customer_info?.name || customer.name;
      }
      if (new Date(order.created_at) < new Date(customer.firstOrder)) {
        customer.firstOrder = order.created_at;
      }
    }
  });

  const filtered = Array.from(customerMap.values())
    .filter((customer) => {
      if (!search) return true;
      return String(customer.name || '').toLowerCase().includes(search) || String(customer.email || '').toLowerCase().includes(search);
    })
    .sort((a, b) => new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime());

  const total = filtered.length;
  const from = (page - 1) * pageSize;
  const items = filtered.slice(from, from + pageSize);

  return { items, page, pageSize, total };
}

export async function getMerchantCustomerDetail(merchantId: string, email: string) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('merchant_id', merchantId)
    .filter('customer_info->>email', 'eq', email)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    orders: orders || [],
    consumerProfile: null,
  };
}

export async function getMerchantOrderDetail(merchantId: string, orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, shipping_labels!shipping_labels_order_id_fkey(*)')
    .eq('id', orderId)
    .eq('merchant_id', merchantId)
    .single();

  if (error) {
    throw error;
  }

  const { data: rawOrderItems, error: orderItemsError } = await supabaseAdmin
    .from('order_items')
    .select('*, products(*)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (orderItemsError) {
    throw orderItemsError;
  }

  const variantIds = Array.from(
    new Set((rawOrderItems || []).map((item) => item.variant_id).filter(Boolean))
  ) as string[];

  let variantMap = new Map<string, any>();

  if (variantIds.length > 0) {
    const { data: variants, error: variantsError } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .in('id', variantIds);

    if (variantsError) {
      throw variantsError;
    }

    variantMap = new Map((variants || []).map((variant) => [variant.id, variant]));
  }

  const orderItems = (rawOrderItems || []).map((item) => ({
    ...item,
    product_variants: item.variant_id ? variantMap.get(item.variant_id) || null : null,
  }));

  const email = order.customer_info?.email;
  let consumerProfile = null;
  let decisionLogs: any[] = [];

  if (email) {
    const [{ data: logsByOrder }, { data: logsByEmail }] = await Promise.all([
      supabaseAdmin.from('ai_decision_log').select('*').eq('order_id', order.id).order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('ai_decision_log').select('*').eq('consumer_email', email).eq('merchant_id', order.merchant_id).order('created_at', { ascending: false }).limit(20),
    ]);
    consumerProfile = null;
    const merged = [...(logsByOrder || []), ...(logsByEmail || [])];
    decisionLogs = merged
      .filter((log, idx, arr) => arr.findIndex((entry) => entry.id === log.id) === idx)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 30);
  }

  return {
    order,
    orderItems,
    labelResult: Array.isArray(order.shipping_labels) ? (order.shipping_labels[0] ?? null) : order.shipping_labels ?? null,
    consumerProfile,
    decisionLogs,
  };
}

export async function getMerchantCategories(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*, products:products(count)')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getMerchantCollections(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('collections')
    .select('*, product_collections(count)')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getMerchantProducts(merchantId: string) {
  const [productsRes, categoriesRes, collectionsRes] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('*, categories(name)')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('categories')
      .select('*')
      .eq('merchant_id', merchantId),
    supabaseAdmin
      .from('collections')
      .select('*')
      .eq('merchant_id', merchantId),
  ]);

  if (productsRes.error) {
    throw productsRes.error;
  }
  if (categoriesRes.error) {
    throw categoriesRes.error;
  }
  if (collectionsRes.error) {
    throw collectionsRes.error;
  }

  return {
    products: productsRes.data || [],
    categories: categoriesRes.data || [],
    collections: collectionsRes.data || [],
  };
}

export async function getMerchantShipmentsPage(merchantId: string, searchParams: URLSearchParams) {
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const page = Number(searchParams.get('page') || 0);
  const search = searchParams.get('search')?.trim() || '';
  const status = searchParams.get('status') || 'all';

  let query = supabaseAdmin
    .from('shipping_labels')
    .select('id, order_id, tracking_number, label_url, tracking_url, carrier_id, carrier_name, service_name, rate_price, rate_currency, to_address, status, created_at, orders(id, customer_info, total_amount)', { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`id::text.ilike.%${search}%,tracking_number.ilike.%${search}%,carrier_name.ilike.%${search}%`);
  }

  const [{ data, count, error }, statsResponse] = await Promise.all([
    query,
    supabaseAdmin
      .from('shipping_labels')
      .select('status')
      .eq('merchant_id', merchantId),
  ]);

  if (error) {
    throw error;
  }
  if (statsResponse.error) {
    throw statsResponse.error;
  }

  const stats = {
    total: statsResponse.data?.length || 0,
    created: (statsResponse.data || []).filter((shipment) => shipment.status === 'created').length,
    inTransit: (statsResponse.data || []).filter((shipment) => shipment.status === 'in_transit').length,
    delivered: (statsResponse.data || []).filter((shipment) => shipment.status === 'delivered').length,
  };

  return {
    items: data || [],
    page,
    pageSize,
    total: count || 0,
    stats,
  };
}
