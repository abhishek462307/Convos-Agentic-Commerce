import { Metadata } from "next"
import { supabaseAdmin } from "@/lib/supabase-admin"
import CategoryClient from "./CategoryClient"
import StorefrontShell from "../../StorefrontShell"

export const revalidate = 60

function toAbsoluteUrl(value?: string | null): string | null {
  if (!value) return null
  try {
    return new URL(value).toString()
  } catch {
    return null
  }
}

async function getCategoryAndMerchant(subdomain: string, categoryId: string) {
  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("id, store_name, business_name, branding_settings")
    .eq("subdomain", subdomain)
    .single()

  if (!merchant) return { merchant: null, category: null }

  const { data: category } = await supabaseAdmin
    .from("categories")
      .select("id, name, image_url")
    .eq("id", categoryId)
    .eq("merchant_id", merchant.id)
    .single()

  return { merchant, category }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string; categoryId: string }>
}): Promise<Metadata> {
  try {
    const { subdomain, categoryId } = await params
    const { merchant, category } = await getCategoryAndMerchant(subdomain, categoryId)

    if (!category || !merchant) {
      return { title: "Category Not Found" }
    }

    const storeName = merchant.store_name || merchant.business_name || subdomain
    const title = category.name
    const description = `Browse ${category.name} at ${storeName}`
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}/category/${categoryId}`
    const logoUrl = toAbsoluteUrl((merchant.branding_settings as any)?.logo_url)
    const ogImage = toAbsoluteUrl(category.image_url) || logoUrl

    return {
      title,
      description,
      openGraph: {
        title: `${title} | ${storeName}`,
        description,
        url,
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${storeName}`,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
      alternates: { canonical: url },
    }
  } catch {
    return { title: "Category" }
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ subdomain: string; categoryId: string }>
}) {
  const { subdomain, categoryId } = await params
  return (
    <StorefrontShell subdomain={subdomain}>
      <CategoryClient subdomain={subdomain} categoryId={categoryId} />
    </StorefrontShell>
  )
}
