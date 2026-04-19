import { Metadata } from "next"
import { supabaseAdmin } from "@/lib/supabase-admin"
import CartPageClient from "./CartPageClient"
import StorefrontShell from "../StorefrontShell"

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
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}/cart`
  return {
    title: `Your Cart — ${storeName}`,
    robots: { index: false, follow: false },
    alternates: { canonical: url },
  }
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params
  return (
    <StorefrontShell subdomain={subdomain}>
      <CartPageClient subdomain={subdomain} />
    </StorefrontShell>
  )
}
