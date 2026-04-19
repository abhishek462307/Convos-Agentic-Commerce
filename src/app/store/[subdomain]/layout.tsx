import { Suspense } from "react"
import { Metadata } from "next"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { StorefrontSkeleton } from "@/components/StoreSkeletons"

async function getMerchant(subdomain: string) {
  const { data } = await supabaseAdmin
    .from("merchants")
    .select("store_name, business_name, meta_title, meta_description, subdomain, branding_settings, google_search_console_id, bing_verification_id, store_email, email, phone, business_address")
    .eq("subdomain", subdomain)
    .single()
  return data
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>
}): Promise<Metadata> {
  const { subdomain } = await params
  const merchant = await getMerchant(subdomain)
  if (!merchant) return { title: "Store Not Found" }

  const storeName = merchant.store_name || merchant.business_name || subdomain
  const title = merchant.meta_title || storeName
  const description = merchant.meta_description || `Shop at ${storeName} — powered by your storefront`
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}`
  const logoUrl = (merchant.branding_settings as any)?.logo_url

  const verification: any = {}
  if (merchant.google_search_console_id) {
    verification.google = merchant.google_search_console_id
  }
  if (merchant.bing_verification_id) {
    verification.bing = merchant.bing_verification_id
  }

  return {
    title: {
      default: title,
      template: `%s | ${storeName}`,
    },
    description,
    metadataBase: new URL("${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}"),
    verification,
    openGraph: {
      title,
      description,
      url,
      siteName: storeName,
      type: "website",
      ...(logoUrl ? { images: [{ url: logoUrl, width: 512, height: 512, alt: storeName }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(logoUrl ? { images: [logoUrl] } : {}),
    },
    alternates: { canonical: url },
  }
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<StorefrontSkeleton />}>
      <style>{`
        html { zoom: 1 !important; }
        html, body, body > div, body > div > div { background: var(--store-bg, #f6f6f7) !important; background-color: var(--store-bg, #f6f6f7) !important; scrollbar-width: none !important; -ms-overflow-style: none !important; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
      `}</style>
      <div className="storefront-root" style={{ background: 'var(--store-bg, #f6f6f7)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </Suspense>
  )
}
