import { resolveMerchantContext } from '@/lib/merchant-context';
import { apiError, apiSuccess } from '@/lib/agentic/route';
import { supabaseAdmin } from '@/lib/supabase-admin';

const AUTONOMOUS_TYPES = new Set(['discount_approved', 'refund_approved', 'loyalty_reward', 'shipping_selected']);
const FLAGGED_TYPES = new Set(['refund_rejected', 'discount_rejected']);

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request);
  if (!result.ok) {
    return apiError(result.error, result.status);
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('ai_decision_log')
    .select('*')
    .eq('merchant_id', result.context.merchantId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return apiError(error.message, 500);
  }

  const logs = data || [];
  const stats = {
    total: logs.length,
    autonomous: logs.filter((log) => AUTONOMOUS_TYPES.has(String(log.decision_type)) && log.outcome?.reason !== 'requires_approval').length,
    flagged: logs.filter((log) => FLAGGED_TYPES.has(String(log.decision_type)) || log.outcome?.reason === 'requires_approval').length,
    pendingApprovals: logs.filter((log) => log.outcome?.reason === 'requires_approval' && !log.override_status).length,
  };

  return apiSuccess({ logs, stats });
}
