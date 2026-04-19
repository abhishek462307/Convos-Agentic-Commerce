import { Metadata } from "next"
import { supabaseAdmin } from "@/lib/supabase-admin"
import StorefrontShell from "../StorefrontShell"
import { StorefrontProductGrid } from "../components/StorefrontProductGrid"

export const revalidate = 60

async function getMerchant(subdomain: string) {
  const { data } = await supabaseAdmin
    .from("merchants")
    .select("store_name, business_name, branding_settings")
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
  const storeName = merchant?.store_name || merchant?.business_name || subdomain
  const title = `All Products | ${storeName}`
  const description = `Browse all products at ${storeName}`
  const logoUrl = (merchant?.branding_settings as any)?.logo_url
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}/products`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      ...(logoUrl ? { images: [{ url: logoUrl }] } : {}),
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

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params
  return (
    <StorefrontShell subdomain={subdomain}>
      <StorefrontProductGrid />
    </StorefrontShell>
  )
}
