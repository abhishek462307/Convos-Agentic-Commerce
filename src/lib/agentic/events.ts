import { supabaseAdmin } from '@/lib/supabase-admin';
import type { MerchantAgentEvent } from '@/types';

interface LogDomainEventInput {
  merchantId: string
  type: string
  title: string
  summary: string
  actor: MerchantAgentEvent['actor']
  confidence?: number
  orderId?: string | null
  consumerEmail?: string | null
  sessionId?: string | null
  factors?: Record<string, unknown>
  outcome?: Record<string, unknown>
}

export async function logDomainEvent(input: LogDomainEventInput) {
  await supabaseAdmin.from('ai_decision_log').insert({
    merchant_id: input.merchantId,
    decision_type: input.type,
    summary: input.title,
    human_summary: input.summary,
    accepted: true,
    confidence: input.confidence ?? 0.92,
    order_id: input.orderId ?? null,
    consumer_email: input.consumerEmail ?? null,
    session_id: input.sessionId ?? null,
    factors: {
      actor: input.actor,
      ...(input.factors || {}),
    },
    outcome: input.outcome || {},
  });
}

export async function listMerchantAgentEvents(merchantId: string, limit = 8): Promise<MerchantAgentEvent[]> {
  const { data } = await supabaseAdmin
    .from('ai_decision_log')
    .select('id, decision_type, summary, human_summary, created_at, factors, tool_called, accepted, channel')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(Math.max(limit * 3, 24));

  return (data || [])
    .filter((event) => {
      const summary = String(event.summary || '');
      if (event.decision_type === 'mcp_interaction') {
        return false;
      }

      if (summary.startsWith('ChatGPT calling tool:')) {
        return false;
      }

      return true;
    })
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      type: String(event.decision_type || 'event'),
      title: String(event.summary || event.decision_type || 'Event'),
      summary: String(event.human_summary || event.summary || event.decision_type || 'Event logged'),
      createdAt: String(event.created_at),
      actor: (event.factors?.actor as MerchantAgentEvent['actor']) || 'agent',
    }));
}
