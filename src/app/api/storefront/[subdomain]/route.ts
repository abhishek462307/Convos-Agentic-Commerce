import { NextRequest, NextResponse } from 'next/server';
import { getStorefrontBrowseData } from '@/lib/storefront-public';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    const categoryId = request.nextUrl.searchParams.get('categoryId');
    const data = await getStorefrontBrowseData(subdomain, categoryId);
    if (!data) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load storefront' },
      { status: 500 }
    );
  }
}
