import { Metadata } from "next"
import { supabaseAdmin } from "@/lib/supabase-admin"
import ProductClient from "./ProductClient"
import StorefrontShell from "../../StorefrontShell"

export const revalidate = 60

async function getProductAndMerchant(subdomain: string, productId: string) {
  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("id, store_name, business_name, currency, subdomain, branding_settings")
    .eq("subdomain", subdomain)
    .single()

  if (!merchant) return { merchant: null, product: null, images: [] }

  const [productRes, imagesRes] = await Promise.all([
    supabaseAdmin.from("products").select("*").eq("id", productId).eq("merchant_id", merchant.id).single(),
    supabaseAdmin.from("product_images").select("url").eq("product_id", productId).order("position").limit(4),
  ])

  return { merchant, product: productRes.data, images: imagesRes.data || [] }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string; id: string }>
}): Promise<Metadata> {
  const { subdomain, id } = await params
  const { merchant, product, images } = await getProductAndMerchant(subdomain, id)

  if (!product || !merchant) {
    return { title: "Product Not Found" }
  }

    const storeName = merchant.store_name || merchant.business_name || subdomain
    const title = product.name
    const description = product.meta_description
      || (product.description ? product.description.slice(0, 160) : null)
      || `${product.name} — available at ${storeName}`
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}/product/${id}`
    const logoUrl = (merchant.branding_settings as Record<string, string> | null)?.logo_url

    const ogImages = images.length > 0
      ? images.map((i) => ({ url: i.url }))
      : product.image_url
        ? [{ url: product.image_url }]
        : logoUrl
          ? [{ url: logoUrl }]
          : []

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${storeName}`,
      description,
      url,
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${storeName}`,
      description,
      images: ogImages.map((i) => i.url),
    },
    alternates: { canonical: url },
  }
}

function ProductJsonLd({
  product,
  merchant,
  images,
  url,
}: {
  product: { name: string; description?: string | null; price: number; stock_quantity: number; image_url?: string | null }
  merchant: { store_name?: string | null; business_name?: string | null; subdomain: string; currency?: string | null }
  images: { url: string }[]
  url: string
}) {
  const imageUrls = images.length > 0
    ? images.map((i) => i.url)
    : product.image_url
      ? [product.image_url]
      : []

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || "",
    image: imageUrls,
    url,
    brand: {
      "@type": "Brand",
      name: merchant.store_name || merchant.business_name || merchant.subdomain,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: merchant.currency || "USD",
      availability: product.stock_quantity === 0
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ subdomain: string; id: string }>
}) {
  const { subdomain, id } = await params
  const { merchant, product, images } = await getProductAndMerchant(subdomain, id)

  return (
    <StorefrontShell subdomain={subdomain}>
      {product && merchant && (
        <ProductJsonLd
          product={product}
          merchant={merchant}
          images={images}
          url={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}/product/${id}`}
        />
      )}
      <ProductClient subdomain={subdomain} id={id} />
    </StorefrontShell>
  )
}
