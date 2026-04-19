import { supabaseAdmin } from '@/lib/supabase-admin';
import { logDomainEvent } from '@/lib/agentic/events';

interface CreateSupportCaseInput {
  merchantId: string
  actorType: 'user' | 'agent' | 'system'
  name: string
  email?: string | null
  message: string
  phone?: string | null
  preferredTime?: string | null
  context?: Record<string, unknown>
}

export async function createSupportCase(input: CreateSupportCaseInput) {
  const { data, error } = await supabaseAdmin
    .from('callback_requests')
    .insert({
      merchant_id: input.merchantId,
      name: input.name,
      phone: input.phone || 'support-pending',
      email: input.email || null,
      message: input.message,
      preferred_time: input.preferredTime || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create support case');
  }

  await logDomainEvent({
    merchantId: input.merchantId,
    type: 'support_case_created',
    title: 'Support case created',
    summary: `Created a support case for ${input.name}.`,
    actor: input.actorType,
    consumerEmail: input.email || null,
    factors: {
      supportCaseId: data.id,
      ...(input.context || {}),
    },
  });

  return data;
}
