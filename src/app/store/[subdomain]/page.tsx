import { Metadata } from "next"
import { Suspense } from "react"
import { supabaseAdmin } from "@/lib/supabase-admin"
import StorefrontShell from "./StorefrontShell"
import { StorefrontSkeleton } from "@/components/StoreSkeletons"

export const revalidate = 60

async function getMerchant(subdomain: string) {
  const { data } = await supabaseAdmin
    .from("merchants")
    .select("store_name, business_name, meta_title, meta_description, branding_settings")
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
  if (!merchant) return {}

  const storeName = merchant.store_name || merchant.business_name || subdomain
  const title = merchant.meta_title || storeName
  const description = merchant.meta_description || `Shop at ${storeName}`
  const logoUrl = (merchant.branding_settings as any)?.logo_url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(logoUrl ? { images: [{ url: logoUrl }] } : {}),
    },
  }
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params
  return (
    <Suspense fallback={<StorefrontSkeleton />}>
      <StorefrontShell subdomain={subdomain} />
    </Suspense>
  )
}
