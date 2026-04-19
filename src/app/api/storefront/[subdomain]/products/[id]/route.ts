import { NextResponse } from 'next/server';
import { getStorefrontProductData } from '@/lib/storefront-public';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string; id: string }> }
) {
  try {
    const { subdomain, id } = await params;
    const data = await getStorefrontProductData(subdomain, id);
    if (!data) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    if (!data.product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load product' },
      { status: 500 }
    );
  }
}
