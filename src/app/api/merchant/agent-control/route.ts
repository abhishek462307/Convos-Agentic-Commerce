import { resolveMerchantContext } from '@/lib/merchant-context';
import { apiError, apiSuccess } from '@/lib/agentic/route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { MerchantAgentEvent } from '@/types';

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const { data, error } = await supabaseAdmin
    .from('ai_decision_log')
    .select('id, decision_type, summary, created_at, outcome')
    .eq('merchant_id', result.context.merchantId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return apiError(error.message || 'Failed to load agent activity');
  }

  const events: MerchantAgentEvent[] = (data || []).map((row: any) => ({
    id: String(row.id),
    type: String(row.decision_type || 'decision'),
    title: String(row.decision_type || 'AI action').replace(/_/g, ' '),
    summary: String(row.summary || row.outcome?.reason || 'AI activity recorded.'),
    createdAt: String(row.created_at || new Date().toISOString()),
    actor: 'agent',
  }));

  return apiSuccess({ events });
}
