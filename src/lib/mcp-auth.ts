import { supabaseAdmin } from './supabase-admin';
import jwt from 'jsonwebtoken';
import { getMcpJwtSecret } from './mcp-jwt';

async function getMerchantByKey(merchantKey: string) {
  const { data } = await supabaseAdmin
    .from('merchants')
    .select('id, mcp_api_key')
    .eq('id', merchantKey)
    .maybeSingle();
  return data;
}

export async function checkMCPAuth(req: Request, merchantKey?: string): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader
    ? (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader)
    : null;

  if (!token) return false;

  // Try to decode as JWT first (OAuth path)
  if (token.includes('.')) {
    try {
      const decoded: any = jwt.verify(token, getMcpJwtSecret());
      if (decoded && (decoded.type === 'mcp_access' || decoded.type === 'mcp_session')) {
        if (merchantKey) {
          const merchant = await getMerchantByKey(merchantKey);
          if (!merchant || decoded.merchantId !== merchant.id) {
            return false;
          }
        }
        return true;
      }
    } catch {
      // Not a valid JWT, fall back to API Key path
    }
  }

  // API Key Path (Old way or manual testing)
  if (merchantKey) {
    const merchant = await getMerchantByKey(merchantKey);
    if (!merchant?.mcp_api_key) return false;
    return token === merchant.mcp_api_key;
  }
  return false;
}
