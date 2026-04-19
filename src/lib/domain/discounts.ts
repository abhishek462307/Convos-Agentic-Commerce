import { supabaseAdmin } from '@/lib/supabase-admin';
import { logDomainEvent } from '@/lib/agentic/events';

interface CreateDiscountInput {
  merchantId: string
  actorType: 'user' | 'agent' | 'system'
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount?: number
  usageLimit?: number | null
  endsAt?: string | null
  context?: Record<string, unknown>
}

export async function createMerchantDiscount(input: CreateDiscountInput) {
  const payload = {
    merchant_id: input.merchantId,
    code: input.code.toUpperCase().replace(/\s+/g, ''),
    type: input.type,
    value: input.value,
    min_order_amount: input.minOrderAmount || 0,
    usage_limit: input.usageLimit ?? null,
    ends_at: input.endsAt || null,
  };

  const { data, error } = await supabaseAdmin
    .from('discounts')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create discount');
  }

  await logDomainEvent({
    merchantId: input.merchantId,
    type: 'discount_created',
    title: 'Discount created',
    summary: `Created discount ${data.code}.`,
    actor: input.actorType,
    factors: {
      discountId: data.id,
      ...(input.context || {}),
    },
    outcome: {
      code: data.code,
      type: data.type,
      value: data.value,
    },
  });

  return data;
}

export async function deactivateMerchantDiscount(merchantId: string, discountId: string, actorType: 'user' | 'agent' | 'system') {
  const { data, error } = await supabaseAdmin
    .from('discounts')
    .update({ is_active: false, ends_at: new Date().toISOString() })
    .eq('merchant_id', merchantId)
    .eq('id', discountId)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to deactivate discount');
  }

  await logDomainEvent({
    merchantId,
    type: 'discount_deactivated',
    title: 'Discount deactivated',
    summary: `Deactivated discount ${data.code}.`,
    actor: actorType,
    factors: { discountId: data.id },
  });

  return data;
}
