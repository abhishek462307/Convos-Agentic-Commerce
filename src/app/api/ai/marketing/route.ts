import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;

async function callAzureOpenAI(systemPrompt: string, userPrompt: string) {
  const isResponsesApi = AZURE_OPENAI_ENDPOINT.includes('/responses');
  
  const body: any = {};
  
  if (isResponsesApi) {
    body.model = DEPLOYMENT_NAME;
    body.input = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    body.max_output_tokens = 1000;
  } else {
    body.messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    body.max_tokens = 1000;
  }

  const response = await fetch(AZURE_OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Azure OpenAI error:', errorText);
    throw new Error(`Azure OpenAI error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Handle both responses API and chat completions API formats
  if (isResponsesApi) {
    const msgItem = data.output?.find((o: any) => o.type === 'message');
    if (msgItem?.content) {
      const textContent = msgItem.content.find((c: any) => c.type === 'output_text');
      return textContent?.text || '';
    }
    return '';
  } else {
    return data.choices?.[0]?.message?.content || '';
  }
}

export async function POST(req: Request) {
  try {
    const { type, merchantId, productIds, campaignName, tone, targetAudience } = await req.json();

    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID required' }, { status: 400 });
    }

    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('store_name, store_industry, currency')
      .eq('id', merchantId)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    let products: any[] = [];
    if (productIds && productIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('products')
        .select('id, name, price, description, image_url, compare_at_price')
        .in('id', productIds);
      products = data || [];
    }

    const currency = merchant.currency || 'USD';
    const formatPrice = (price: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);

    const productContext = products.length > 0
      ? products.map(p => {
          const hasDiscount = p.compare_at_price && p.compare_at_price > p.price;
          return `- ${p.name}: ${formatPrice(p.price)}${hasDiscount ? ` (was ${formatPrice(p.compare_at_price)})` : ''}\n  Description: ${p.description?.slice(0, 100) || 'No description'}`;
        }).join('\n')
      : 'No specific products selected - generate general promotional content.';

    const toneInstructions: Record<string, string> = {
      professional: 'Use professional, polished language. Be authoritative and trustworthy.',
      casual: 'Use friendly, casual language. Be approachable and conversational.',
      urgent: 'Create urgency and excitement. Use action words and limited-time offers.',
      luxury: 'Use sophisticated, premium language. Focus on exclusivity and quality.',
    };

    const systemPrompt = `You are an expert marketing copywriter for ${merchant.store_name}, a ${merchant.store_industry || 'retail'} business.

TONE: ${toneInstructions[tone as string] || toneInstructions.casual}

TARGET AUDIENCE: ${targetAudience || 'General customers'}

PRODUCTS TO PROMOTE:
${productContext}

Generate compelling marketing content that:
- Highlights key product benefits
- Creates desire and urgency
- Includes a clear call-to-action
- Matches the specified tone
- Is optimized for the channel (${type})

${type === 'email' ? `
EMAIL REQUIREMENTS:
- Subject line (max 50 chars, attention-grabbing)
- Preview text (max 90 chars)
- Headline (compelling, benefit-focused)
- Body copy (2-3 paragraphs max)
- CTA button text (action-oriented)
` : ''}

${type === 'whatsapp' ? `
WHATSAPP REQUIREMENTS:
- Keep the message under 500 characters
- Use 1-2 relevant emojis naturally
- Include a direct call-to-action
- Sound personal and conversational
- No formal greeting - jump right in
` : ''}

Respond in JSON format with these fields:
${type === 'email' ? '{ "subject": "", "previewText": "", "headline": "", "bodyText": "", "ctaText": "" }' : ''}
${type === 'whatsapp' ? '{ "message": "" }' : ''}`;

    const userPrompt = `Generate ${type} marketing content for campaign: "${campaignName || 'Promotional Campaign'}"`;

    const content = await callAzureOpenAI(systemPrompt, userPrompt);

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      if (type === 'email') {
        parsed = {
          subject: campaignName || 'Special Offer Inside!',
          previewText: 'Don\'t miss out on these amazing deals',
          headline: campaignName || 'Exclusive Deals Just for You',
          bodyText: content,
          ctaText: 'Shop Now'
        };
      } else {
        parsed = { message: content };
      }
    }

    return NextResponse.json({
      success: true,
      content: parsed,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        sale_price: p.compare_at_price && p.compare_at_price > p.price ? p.price : undefined
      }))
    });
  } catch (error: any) {
    logger.error('Marketing AI error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to generate content' 
    }, { status: 500 });
  }
}
