import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 });
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch OpenAI models' }, { status: res.status });
      }

      const data = await res.json();
      // Filter for chat models to keep it clean
      const chatModels = data.data
        .filter((m: any) => m.id.startsWith('gpt-'))
        .map((m: any) => m.id)
        .sort();

      return NextResponse.json({ models: chatModels });
    }

    if (provider === 'anthropic') {
      // Anthropic doesn't have a public "list models" API that is easily accessible with a standard key 
      // in the same way OpenAI does, but they recently added a /v1/models endpoint.
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });

      if (!res.ok) {
        // Fallback for Anthropic if models endpoint is not available for the key
        return NextResponse.json({ 
          models: ["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"] 
        });
      }

      const data = await res.json();
      const models = data.data.map((m: any) => m.id);
      return NextResponse.json({ models });
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch models' }, { status: 500 });
  }
}
