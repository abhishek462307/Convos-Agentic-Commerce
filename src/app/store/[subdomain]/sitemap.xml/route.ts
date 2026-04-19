import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"

export const revalidate = 3600 // Revalidate every hour

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: number
}

function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map(
      (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ""}${url.changefreq ? `\n    <changefreq>${url.changefreq}</changefreq>` : ""}${url.priority !== undefined ? `\n    <priority>${url.priority}</priority>` : ""}
  </url>`
    )
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("id, subdomain, custom_domain, updated_at, is_indexable")
    .eq("subdomain", subdomain)
    .single()

  if (!merchant || merchant.is_indexable === false) {
    // Return empty sitemap for non-existent or non-indexable stores
    return new NextResponse(generateSitemapXml([]), {
      headers: { "Content-Type": "application/xml" },
    })
  }

  const baseUrl = merchant.custom_domain
    ? `https://${merchant.custom_domain}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}`

  const now = new Date().toISOString()
  const lastmod = merchant.updated_at
    ? new Date(merchant.updated_at).toISOString()
    : now

  // Static pages
  const urls: SitemapUrl[] = [
    { loc: baseUrl, lastmod, changefreq: "daily", priority: 1.0 },
    { loc: `${baseUrl}/products`, lastmod, changefreq: "daily", priority: 0.9 },
    { loc: `${baseUrl}/about`, lastmod, changefreq: "monthly", priority: 0.5 },
    { loc: `${baseUrl}/contact`, lastmod, changefreq: "monthly", priority: 0.5 },
    { loc: `${baseUrl}/shipping`, lastmod, changefreq: "monthly", priority: 0.4 },
    { loc: `${baseUrl}/returns`, lastmod, changefreq: "monthly", priority: 0.4 },
    { loc: `${baseUrl}/privacy`, lastmod, changefreq: "monthly", priority: 0.3 },
    { loc: `${baseUrl}/terms`, lastmod, changefreq: "monthly", priority: 0.3 },
  ]

  // Fetch active products
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, updated_at, status")
    .eq("merchant_id", merchant.id)
    .eq("status", "active")

  if (products && products.length > 0) {
    for (const product of products) {
      urls.push({
        loc: `${baseUrl}/product/${product.id}`,
        lastmod: product.updated_at
          ? new Date(product.updated_at).toISOString()
          : lastmod,
        changefreq: "weekly",
        priority: 0.8,
      })
    }
  }

  // Fetch categories
  const { data: categories } = await supabaseAdmin
    .from("products")
    .select("category")
    .eq("merchant_id", merchant.id)
    .eq("status", "active")
    .not("category", "is", null)

  if (categories && categories.length > 0) {
    const uniqueCategories = [
      ...new Set(categories.map((c) => c.category).filter(Boolean)),
    ]
    for (const category of uniqueCategories) {
      const categorySlug = encodeURIComponent(
        category!.toLowerCase().replace(/\s+/g, "-")
      )
      urls.push({
        loc: `${baseUrl}/category/${categorySlug}`,
        lastmod,
        changefreq: "weekly",
        priority: 0.7,
      })
    }
  }

  // Fetch custom pages
  const { data: pages } = await supabaseAdmin
    .from("store_pages")
    .select("slug, updated_at")
    .eq("merchant_id", merchant.id)
    .eq("is_published", true)

  if (pages && pages.length > 0) {
    for (const page of pages) {
      urls.push({
        loc: `${baseUrl}/pages/${page.slug}`,
        lastmod: page.updated_at
          ? new Date(page.updated_at).toISOString()
          : lastmod,
        changefreq: "monthly",
        priority: 0.5,
      })
    }
  }

  return new NextResponse(generateSitemapXml(urls), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
