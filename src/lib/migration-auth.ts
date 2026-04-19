import { getAuthUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

type MigrationAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string };

export async function authorizeMigrationRequest(request: Request): Promise<MigrationAuthResult> {
  const headerSecret = request.headers.get('x-migration-secret');
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  const configuredSecret = process.env.MIGRATION_SECRET;

  if (configuredSecret && (headerSecret === configuredSecret || querySecret === configuredSecret)) {
    return { ok: true };
  }

  const user = await getAuthUser(request);
  if (!user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const { data: owner } = await supabaseAdmin
    .from('merchants')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!owner) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true };
}

export function buildAdminRlsPolicySql(tableName: string, policyName = `${tableName}_admin_access`) {
  return `
    ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "${policyName}" ON ${tableName};
    CREATE POLICY "${policyName}"
    ON ${tableName}
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM merchants
        WHERE merchants.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM merchants
        WHERE merchants.user_id = auth.uid()
      )
    );
  `;
}
