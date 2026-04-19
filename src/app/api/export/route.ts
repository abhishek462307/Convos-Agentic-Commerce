import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const type = searchParams.get('type') || 'products';

    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 });
    }

    const access = await getMerchantAccess(user.id, merchantId);
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    let csvContent = '';

    if (type === 'products') {
      const { data: products, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      csvContent = 'Name,Description,Price,SKU,Stock Quantity,Category,Badge,Image URL,Meta Title,Meta Description\n';
      csvContent += (products || []).map(p => 
        `"${(p.name || '').replace(/"/g, '""')}","${(p.description || '').replace(/"/g, '""')}",${p.price || 0},"${p.sku || ''}",${p.stock_quantity ?? ''},"${p.categories?.name || ''}","${p.badge || ''}","${p.image_url || ''}","${p.meta_title || ''}","${(p.meta_description || '').replace(/"/g, '""')}"`
      ).join('\n');
    } else if (type === 'orders') {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name))')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      csvContent = 'Order ID,Date,Customer Name,Customer Email,Status,Payment Method,Total,Items\n';
      csvContent += (orders || []).map(o => {
        const items = (o.order_items || []).map((i: any) => `${i.products?.name || 'Product'} x${i.quantity}`).join('; ');
        return `"${o.id.slice(0, 8).toUpperCase()}","${new Date(o.created_at).toISOString()}","${o.customer_info?.name || ''}","${o.customer_info?.email || ''}","${o.status}","${o.payment_method || ''}",${o.total_amount},"${items}"`;
      }).join('\n');
    } else if (type === 'customers') {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_info, total_amount, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customersMap = new Map();
      (orders || []).forEach(o => {
        const email = o.customer_info?.email;
        if (email) {
          if (customersMap.has(email)) {
            const existing = customersMap.get(email);
            existing.orders += 1;
            existing.totalSpent += o.total_amount;
            if (new Date(o.created_at) > new Date(existing.lastOrder)) {
              existing.lastOrder = o.created_at;
            }
          } else {
            customersMap.set(email, {
              name: o.customer_info?.name || '',
              email,
              phone: o.customer_info?.phone || '',
              orders: 1,
              totalSpent: o.total_amount,
              lastOrder: o.created_at
            });
          }
        }
      });

      csvContent = 'Name,Email,Phone,Total Orders,Total Spent,Last Order\n';
      csvContent += Array.from(customersMap.values()).map(c => 
        `"${c.name}","${c.email}","${c.phone}",${c.orders},${c.totalSpent},"${new Date(c.lastOrder).toISOString()}"`
      ).join('\n');
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (err: any) {
    logger.error('Export error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
