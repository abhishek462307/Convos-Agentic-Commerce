import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { authorizeMigrationRequest, buildAdminRlsPolicySql } from '@/lib/migration-auth';

export async function POST(request: Request) {
  const auth = await authorizeMigrationRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sql = `
ALTER TABLE ai_decision_log ADD COLUMN IF NOT EXISTS reasoning_chain jsonb;
ALTER TABLE ai_decision_log ADD COLUMN IF NOT EXISTS override_status text;
ALTER TABLE ai_decision_log ADD COLUMN IF NOT EXISTS override_reason text;
ALTER TABLE ai_decision_log ADD COLUMN IF NOT EXISTS overridden_at timestamptz;

CREATE TABLE IF NOT EXISTS decision_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_log_id uuid NOT NULL REFERENCES ai_decision_log(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  action text DEFAULT 'override',
  reason text,
  original_outcome jsonb,
  new_outcome jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE decision_overrides ADD COLUMN IF NOT EXISTS action text DEFAULT 'override';
${buildAdminRlsPolicySql('decision_overrides')}

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_negotiation_policy text DEFAULT 'disabled';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_max_discount_percentage numeric DEFAULT 0;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_refund_policy text DEFAULT 'approval_required';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_max_refund_amount numeric DEFAULT 0;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_loyalty_policy text DEFAULT 'autonomous';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ai_shipping_policy text DEFAULT 'autonomous';
`;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
