import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"

export const revalidate = 3600 // Revalidate every hour

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params

  const { data: merchant, error } = await supabaseAdmin
    .from("merchants")
    .select("subdomain, custom_domain, is_indexable")
    .eq("subdomain", subdomain)
    .single()

  if (error) {
    // Return a safe non-cached failure response on DB error
    return new NextResponse("User-agent: *\nAllow: /", {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store, max-age=0",
      },
    })
  }

  if (!merchant) {
    return new NextResponse("User-agent: *\nDisallow: /", {
      headers: { "Content-Type": "text/plain" },
    })
  }

  // If store is not indexable, block all
  if (merchant.is_indexable === false) {
    return new NextResponse("User-agent: *\nDisallow: /", {
      headers: { "Content-Type": "text/plain" },
    })
  }

  const baseUrl = merchant.custom_domain
    ? `https://${merchant.custom_domain}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}`

  const robotsTxt = `User-agent: *
Allow: /

# Search engine verification
${merchant.custom_domain ? `Host: ${merchant.custom_domain}` : ""}

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Disallow checkout flow (shouldn't be indexed)
Disallow: /checkout
Disallow: /cart
Disallow: /login
Disallow: /signup
Disallow: /verify
Disallow: /account

# Allow product pages
Allow: /product/
Allow: /products
Allow: /category/
Allow: /about
Allow: /contact
Allow: /pages/
`

  return new NextResponse(robotsTxt, {
    headers: { "Content-Type": "text/plain" },
  })
}
