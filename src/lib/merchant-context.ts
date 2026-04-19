import { type User } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { MerchantContext } from '@/types';

type MerchantContextResult =
  | { ok: true; context: MerchantContext; user: User }
  | { ok: false; status: 401 | 404; error: string };

export async function resolveMerchantContext(
  request: Request,
  requiredPermission?: string
): Promise<MerchantContextResult> {
  void requiredPermission;
  const user = await getAuthUser(request);
  if (!user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const merchantSelect = '*, ai_tone, ai_custom_instructions, ai_negotiation_style, ai_character_name, ai_character_persona, ai_character_avatar_url, ai_character_backstory';
  const { data: ownerMerchant } = await supabaseAdmin
    .from('merchants')
    .select(merchantSelect)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownerMerchant) {
    return {
      ok: true,
      user,
      context: {
        merchant: ownerMerchant,
        merchantId: ownerMerchant.id,
        isOwner: true,
        permissions: ['*'],
      },
    };
  }
  return { ok: false, status: 404, error: 'Merchant not found' };
}
