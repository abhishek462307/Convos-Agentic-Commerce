export type FooterPageType = 'about' | 'privacy' | 'terms' | 'returns' | 'custom'

export type FooterPageRecord = {
  id?: string
  merchant_id?: string
  page_type: FooterPageType
  title: string
  slug: string
  content_markdown: string
  enabled: boolean
  sort_order: number
  seo_title?: string | null
  seo_description?: string | null
  created_at?: string
  updated_at?: string
}

export type FooterPageDraft = FooterPageRecord

export const DEFAULT_FOOTER_PAGE_DEFINITIONS: FooterPageDraft[] = [
  {
    page_type: 'about',
    title: 'About Us',
    slug: 'about',
    content_markdown: '',
    enabled: true,
    sort_order: 0,
  },
  {
    page_type: 'privacy',
    title: 'Privacy Policy',
    slug: 'privacy',
    content_markdown: '',
    enabled: true,
    sort_order: 1,
  },
  {
    page_type: 'terms',
    title: 'Terms of Service',
    slug: 'terms',
    content_markdown: '',
    enabled: true,
    sort_order: 2,
  },
  {
    page_type: 'returns',
    title: 'Refunds, Returns & Replacements',
    slug: 'returns',
    content_markdown: '',
    enabled: true,
    sort_order: 3,
  },
]

export function slugifyFooterPageTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getStoreName(storeName: string) {
  return storeName.trim() || 'our store'
}

export function getDefaultFooterPageDrafts(storeName: string): FooterPageDraft[] {
  const safeStoreName = getStoreName(storeName)

  return DEFAULT_FOOTER_PAGE_DEFINITIONS.map((page) => {
    if (page.page_type === 'about') {
      return {
        ...page,
        content_markdown: `Welcome to ${safeStoreName}. We build a storefront that is designed to make shopping faster, clearer, and more helpful for every customer.\n\nUse this page to tell shoppers who you are, what you sell, and what makes your store different.`,
      }
    }

    if (page.page_type === 'privacy') {
      return {
        ...page,
        content_markdown: `We respect your privacy and only use customer information to process orders, provide support, and improve the shopping experience.\n\nThis page is where you can explain what data you collect, how long you keep it, and how shoppers can contact you about privacy requests.`,
      }
    }

    if (page.page_type === 'terms') {
      return {
        ...page,
        content_markdown: `These terms explain how customers may use ${safeStoreName}, how orders are processed, and what responsibilities apply to both the merchant and the customer.\n\nAdd your service rules, payment terms, and any country-specific requirements here.`,
      }
    }

    return {
      ...page,
      content_markdown: `Refunds, returns, and replacements are handled according to the policy you set in the merchant panel.\n\nUse this page to explain eligibility, time windows, return shipping, replacement handling, and approval steps.`,
    }
  })
}

export function normalizeFooterPageDraft(page: Partial<FooterPageRecord>, index = 0): FooterPageDraft {
  const title = typeof page.title === 'string' && page.title.trim() ? page.title.trim() : `Page ${index + 1}`
  const pageType = (page.page_type || 'custom') as FooterPageType
  const slug = typeof page.slug === 'string' && page.slug.trim()
    ? slugifyFooterPageTitle(page.slug)
    : pageType === 'custom'
      ? slugifyFooterPageTitle(title) || `page-${index + 1}`
      : pageType

  return {
    id: typeof page.id === 'string' ? page.id : undefined,
    merchant_id: typeof page.merchant_id === 'string' ? page.merchant_id : undefined,
    page_type: pageType,
    title,
    slug,
    content_markdown: typeof page.content_markdown === 'string' ? page.content_markdown : '',
    enabled: page.enabled !== false,
    sort_order: Number.isFinite(page.sort_order) ? Number(page.sort_order) : index,
    seo_title: typeof page.seo_title === 'string' ? page.seo_title : null,
    seo_description: typeof page.seo_description === 'string' ? page.seo_description : null,
    created_at: page.created_at,
    updated_at: page.updated_at,
  }
}

export function getFooterPageTitle(pageType: FooterPageType, fallback?: string) {
  if (fallback?.trim()) return fallback.trim()

  switch (pageType) {
    case 'about':
      return 'About Us'
    case 'privacy':
      return 'Privacy Policy'
    case 'terms':
      return 'Terms of Service'
    case 'returns':
      return 'Refunds, Returns & Replacements'
    default:
      return 'Custom Page'
  }
}

export function getFooterPageFallbackMarkdown(pageType: FooterPageType, storeName: string) {
  const safeStoreName = getStoreName(storeName)

  switch (pageType) {
    case 'about':
      return `Welcome to ${safeStoreName}. We build a storefront that is designed to make shopping faster, clearer, and more helpful for every customer.\n\nUse this page to tell shoppers who you are, what you sell, and what makes your store different.`
    case 'privacy':
      return `We respect your privacy and only use customer information to process orders, provide support, and improve the shopping experience.\n\nThis page is where you can explain what data you collect, how long you keep it, and how shoppers can contact you about privacy requests.`
    case 'terms':
      return `These terms explain how customers may use ${safeStoreName}, how orders are processed, and what responsibilities apply to both the merchant and the customer.\n\nAdd your service rules, payment terms, and any country-specific requirements here.`
    case 'returns':
      return 'Refunds, returns, and replacements are handled according to the policy you set in the merchant panel.\n\nUse this page to explain eligibility, time windows, return shipping, replacement handling, and approval steps.'
    default:
      return 'This page has not been published yet. Please check back later or contact the merchant if you expected content here.'
  }
}
