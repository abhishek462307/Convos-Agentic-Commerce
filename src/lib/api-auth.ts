import { createClient, type User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-admin';
import { createClient as createServerSupabaseClient } from './supabase-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getAuthUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      return data.user;
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export async function getMerchantAccess(
  userId: string,
  merchantId: string,
  permission?: string
): Promise<{ ok: true; merchant: { id: string; user_id: string }; isOwner: boolean } | { ok: false; status: 403 | 404 }> {
  void permission;
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('id, user_id')
    .eq('id', merchantId)
    .single();

  if (!merchant) return { ok: false, status: 404 };

  if (merchant.user_id === userId) {
    return { ok: true, merchant, isOwner: true };
  }

  return { ok: false, status: 403 };
}
