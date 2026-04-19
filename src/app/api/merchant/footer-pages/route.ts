import { NextResponse } from 'next/server'
import { resolveMerchantContext } from '@/lib/merchant-context'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  normalizeFooterPageDraft,
  type FooterPageDraft,
} from '@/lib/storefront/footer-pages'

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS merchant_footer_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  page_type text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  slug text NOT NULL,
  content_markdown text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, slug)
);

ALTER TABLE merchant_footer_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read merchant footer pages" ON merchant_footer_pages;
CREATE POLICY "Public read merchant footer pages" ON merchant_footer_pages
  FOR SELECT USING (true);
`

async function ensureFooterPagesTable() {
  const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: CREATE_TABLE_SQL })
  if (error) {
    throw error
  }
}

function sortPages(pages: FooterPageDraft[]) {
  return [...pages].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.title.localeCompare(b.title)
  })
}

export async function GET(request: Request) {
  const result = await resolveMerchantContext(request, 'settings')
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  try {
    await ensureFooterPagesTable()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize footer pages'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data, error } = await supabaseAdmin
    .from('merchant_footer_pages')
    .select('*')
    .eq('merchant_id', result.context.merchantId)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = Array.isArray(data) && data.length > 0
    ? sortPages((data as FooterPageDraft[]).map((page, index) => normalizeFooterPageDraft(page, index)))
    : []

  return NextResponse.json({ items })
}

export async function PUT(request: Request) {
  const result = await resolveMerchantContext(request, 'settings')
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const pagesInput = Array.isArray(body?.pages) ? body.pages : null
  if (!pagesInput) {
    return NextResponse.json({ error: 'pages is required' }, { status: 400 })
  }

  try {
    await ensureFooterPagesTable()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize footer pages'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const pages = pagesInput.map((page: FooterPageDraft, index: number) => normalizeFooterPageDraft(page, index))
  const existingResult = await supabaseAdmin
    .from('merchant_footer_pages')
    .select('id, slug')
    .eq('merchant_id', result.context.merchantId)

  if (existingResult.error) {
    return NextResponse.json({ error: existingResult.error.message }, { status: 500 })
  }

  const existingRows = Array.isArray(existingResult.data) ? existingResult.data : []
  const incomingSlugs = new Set(pages.map((page: FooterPageDraft) => page.slug))
  const removedSlugs = existingRows
    .map((row: { slug: string }) => row.slug)
    .filter((slug: string) => !incomingSlugs.has(slug))

  const payload = pages.map((page: FooterPageDraft, index: number) => ({
    merchant_id: result.context.merchantId,
    page_type: page.page_type,
    title: page.title,
    slug: page.slug,
    content_markdown: page.content_markdown,
    enabled: page.enabled,
    sort_order: page.sort_order ?? index,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    updated_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await supabaseAdmin
    .from('merchant_footer_pages')
    .upsert(payload, { onConflict: 'merchant_id,slug' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  if (removedSlugs.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from('merchant_footer_pages')
      .delete()
      .eq('merchant_id', result.context.merchantId)
      .in('slug', removedSlugs)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('merchant_footer_pages')
    .select('*')
    .eq('merchant_id', result.context.merchantId)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, items: data || [] })
}
