import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/ucp-utils';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const merchant = await getMerchantFromRequest(host);

  if (!merchant) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;

  const ucpProfile = {
    version: '2026-01-24',
    identity: {
      name: merchant.store_name,
      description: merchant.meta_description || `Official agentic storefront for ${merchant.store_name}`,
      url: baseUrl,
      logo: merchant.branding_settings?.logo_url || `${baseUrl}/logo.png`,
    },
    capabilities: {
      discovery: {
        products_url: `${baseUrl}/api/ucp/products`,
        categories_url: `${baseUrl}/api/ucp/categories`,
      },
      transaction: {
        checkout_url: `${baseUrl}/api/ucp/checkout`,
        negotiation_url: `${baseUrl}/api/ucp/negotiate`,
        supported_methods: ['stripe', 'ucp_token'],
      },
      agent: {
        interaction_mode: 'autonomous',
        personality: merchant.bargain_ai_personality || 'professional',
        bargain_enabled: merchant.bargain_mode_enabled || false,
      }
    },
    compliance: {
      terms_url: `${baseUrl}/terms`,
      privacy_url: `${baseUrl}/privacy`,
    }
  };

  return NextResponse.json(ucpProfile, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
