import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function getMerchantFromRequest(host: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Resolve the single active merchant for the current deployment host.
  const normalizedHost = host.toLowerCase().split(':')[0].replace(/^www\./, '');

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!merchant) return null;

  if (merchant.custom_domain && merchant.domain_verified) {
    const normalizedCustomDomain = String(merchant.custom_domain).toLowerCase().replace(/^www\./, '');
    const hostMatchesCustomDomain = normalizedHost === normalizedCustomDomain;
    const isLocalDevHost = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1';
    if (!hostMatchesCustomDomain && !isLocalDevHost) {
      return null;
    }
  }

  return merchant;
}
