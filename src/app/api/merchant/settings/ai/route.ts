import { NextResponse } from 'next/server';
import { resolveMerchantContext } from '@/lib/merchant-context';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PATCH(request: Request) {
  const result = await resolveMerchantContext(request, 'settings');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await request.json();
  const currentBranding = (result.context.merchant.branding_settings as Record<string, unknown> | null) || {};

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .update({
      ai_tone: body.ai_tone || 'friendly',
      ai_negotiation_style: body.ai_negotiation_style || 'moderate',
      ai_custom_instructions: body.ai_custom_instructions || '',
      bargain_mode_enabled: Boolean(body.bargain_mode_enabled),
      bargain_ai_personality: body.bargain_ai_personality || 'friendly',
      branding_settings: {
        ...currentBranding,
        exclude_bargained_from_discounts: body.exclude_bargained_from_discounts !== false,
      },
    })
    .eq('id', result.context.merchantId)
    .select('id, ai_tone, ai_negotiation_style, ai_custom_instructions, bargain_mode_enabled, bargain_ai_personality, branding_settings')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, merchant: data });
}
