import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, apiKey, model } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ valid: false, error: 'Provider and API key are required' });
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) return NextResponse.json({ valid: false, error: 'Invalid API key' });
        if (res.status === 404) return NextResponse.json({ valid: false, error: 'Model not found. Check model name.' });
        return NextResponse.json({ valid: false, error: `OpenAI error: ${res.status}` });
      }

      return NextResponse.json({ valid: true, provider: 'openai' });
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Say "ok"' }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) return NextResponse.json({ valid: false, error: 'Invalid API key' });
        if (res.status === 404) return NextResponse.json({ valid: false, error: 'Model not found. Check model name.' });
        return NextResponse.json({ valid: false, error: `Anthropic error: ${res.status}` });
      }

      return NextResponse.json({ valid: true, provider: 'anthropic' });
    }

    return NextResponse.json({ valid: false, error: 'Unknown provider' });
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message || 'Validation failed' });
  }
}
