import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { getMerchantFromRequest } from '@/lib/ucp-utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const baseUrl = `${protocol}://${host}`

  const MAIN_DOMAINS = new Set([
    'localhost:3000',
    'localhost',
    '127.0.0.1',
    'localhost',
    '127.0.0.1',
  ])

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Platform Sitemap (Main Domain)
  if (MAIN_DOMAINS.has(host) || host.endsWith('.vercel.app')) {
    const staticRoutes: MetadataRoute.Sitemap = [
      { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
      { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ]

    try {
      const { data: merchants } = await supabase
        .from('merchants')
        .select('subdomain, updated_at')
        .not('subdomain', 'is', null)

      const storeRoutes: MetadataRoute.Sitemap = (merchants || []).map((m) => ({
        url: `${baseUrl}/store/${m.subdomain}`,
        lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }))

      return [...staticRoutes, ...storeRoutes]
    } catch {
      return staticRoutes
    }
  }

  // 2. Merchant Storefront Sitemap (Subdomain or Custom Domain)
  try {
    const merchant = await getMerchantFromRequest(host)
    if (!merchant) return []

    const storeStaticRoutes: MetadataRoute.Sitemap = [
      { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
      { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    ]

    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('id, updated_at').eq('merchant_id', merchant.id).eq('status', 'active'),
      supabase.from('categories').select('id, created_at').eq('merchant_id', merchant.id)
    ])

    const productRoutes: MetadataRoute.Sitemap = (productsRes.data || []).map((p) => ({
      url: `${baseUrl}/product/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }))

    const categoryRoutes: MetadataRoute.Sitemap = (categoriesRes.data || []).map((c) => ({
      url: `${baseUrl}/category/${c.id}`,
      lastModified: c.created_at ? new Date(c.created_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...storeStaticRoutes, ...productRoutes, ...categoryRoutes]
  } catch (error) {
    return [{ url: baseUrl, lastModified: new Date() }]
  }
}
