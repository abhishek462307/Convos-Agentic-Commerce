"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"
import { Loader2, MessageCircle } from "lucide-react"
import type { FooterSection } from "@/components/footer"
import {
    DEFAULT_FOOTER_LINKS,
    DEFAULT_NAVIGATION_LINKS,
    getStorefrontPath,
    resolveStorefrontLinkHref,
  } from "@/lib/storefront/navigation"

type FooterMerchant = {
  store_name?: string | null
  business_name?: string | null
  subdomain: string
  store_email?: string | null
  email?: string | null
  phone?: string | null
  business_address?: string | null
  branding_settings?: any
}

const socialConfig = [
  { key: "instagram", label: "Instagram", icon: "instagram" as const },
  { key: "twitter", label: "X", icon: "x" as const },
  { key: "facebook", label: "Facebook", icon: "facebook" as const },
  { key: "youtube", label: "YouTube", icon: "youtube" as const },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
]

function normalizeSocialHref(key: string, value: string) {
  if (!value) return null

  if (key === "whatsapp") {
    const digits = value.replace(/[^0-9]/g, "")
    return digits ? `https://wa.me/${digits}` : null
  }

  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function normalizeFooterLinks(
  subdomain: string,
  links: any[] | undefined,
  fallback: typeof DEFAULT_FOOTER_LINKS | typeof DEFAULT_NAVIGATION_LINKS
) {
  const source = Array.isArray(links) ? links : fallback

  return source
    .map((link, index) => ({
      title: typeof link?.label === "string" && link.label.trim() ? link.label.trim() : fallback[index]?.label || `Link ${index + 1}`,
      href: resolveStorefrontLinkHref(subdomain, typeof link?.href === "string" ? link.href : fallback[index]?.href || "/"),
    }))
    .filter((link) => !!link.href)
}

function buildBrandMark(storeName: string, logoUrl: string | null, logoWidth: number, logoHeight: number) {
  if (logoUrl) {
    return (
      <div
        className="relative overflow-hidden"
        style={{ width: `${Math.max(96, Math.min(logoWidth, 180))}px`, height: `${Math.max(32, Math.min(logoHeight, 64))}px` }}
      >
        <Image src={logoUrl} alt={storeName} fill sizes="180px" className="object-contain object-left" />
      </div>
    )
  }

  return <p className="text-lg font-semibold tracking-tight">{storeName}</p>
}

export function StorefrontFooter({ merchant }: { merchant: FooterMerchant }) {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const branding = merchant.branding_settings || {}
  const storeName = merchant.store_name || merchant.business_name || merchant.subdomain
  const socials = branding.social_links || branding.socials || {}
  const logoUrl = branding.logo_url_desktop || branding.logo_url || null
  const logoWidth = branding.logo_width_desktop || branding.logo_width_mobile || 120
  const logoHeight = branding.logo_height_desktop || branding.logo_height_mobile || 40
  const navigationLinks = normalizeFooterLinks(merchant.subdomain, branding.navigation_links, DEFAULT_NAVIGATION_LINKS)
  const footerLinks = normalizeFooterLinks(merchant.subdomain, branding.footer_links, DEFAULT_FOOTER_LINKS)

  const footerDescription = typeof branding.footer_description === "string" && branding.footer_description.trim()
    ? branding.footer_description.trim()
    : "Conversational commerce with AI-led discovery, faster buying, and smarter support."
  const footerNote = typeof branding.footer_note === "string" && branding.footer_note.trim() ? branding.footer_note.trim() : "Powered by your storefront"

  const renderedSocials = socialConfig
    .map((item) => {
      const raw = socials[item.key]
      if (typeof raw !== "string" || !raw.trim()) return null
      return {
        title: item.label,
        href: normalizeSocialHref(item.key, raw.trim()),
        icon: item.icon === "x"
          ? <span className="text-[15px] font-semibold leading-none">X</span>
          : item.icon === "instagram"
            ? <span className="text-[11px] font-semibold uppercase tracking-wide">IG</span>
            : item.icon === "facebook"
              ? <span className="text-[11px] font-semibold uppercase tracking-wide">FB</span>
              : item.icon === "youtube"
                ? <span className="text-[11px] font-semibold uppercase tracking-wide">YT</span>
                : item.icon
                  ? <item.icon className="w-5 h-5 stroke-[1.8]" />
                  : null,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.href))

  const sections: FooterSection[] = [
    {
      label: "QUICK LINKS",
      links: navigationLinks,
    },
    {
      label: "SUPPORT",
      links: footerLinks,
    },
  ]

  const handleNewsletterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      toast.error("Enter your email to subscribe.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          subdomain: merchant.subdomain,
          source: 'store_footer',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to subscribe.')
        return
      }

      toast.success(data.message || 'Subscribed successfully.')
      setEmail('')
    } catch {
      toast.error('Failed to subscribe.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white pt-12 pb-8 px-5 md:px-8 border-t" style={{ borderColor: 'var(--store-border)' }}>
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 mb-12 md:mb-16">
          {/* Brand Col */}
          <div className="space-y-6">
            <Link href={getStorefrontPath(merchant.subdomain, '/', typeof window !== 'undefined' ? window.location.host : undefined)} className="block">
              {buildBrandMark(storeName, logoUrl, logoWidth, logoHeight)}
            </Link>
            <p className="text-[13px] font-medium leading-relaxed opacity-60 max-w-[240px]">
              {footerDescription}
            </p>
            <div className="flex items-center gap-3">
              {renderedSocials.map((social) => (
                <a 
                  key={social.title}
                  href={social.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border flex items-center justify-center text-zinc-900 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ borderColor: 'var(--store-border)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary)'
                    e.currentTarget.style.borderColor = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'var(--store-border)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = 'var(--primary)'
                    e.currentTarget.style.borderColor = 'var(--primary)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'var(--store-border)'
                  }}
                  aria-label={social.title}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Cols */}
          {sections.map((section) => (
            <div key={section.label}>
              <h3 className="text-[12px] font-black uppercase tracking-widest mb-6 opacity-40">
                {section.label}
              </h3>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.title}>
                    <Link 
                      href={link.href}
                      className="text-[13px] font-bold hover:text-primary transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Col */}
          <div>
            <h3 className="text-[12px] font-black uppercase tracking-widest mb-6 opacity-40">
              NEWSLETTER
            </h3>
            <p className="text-[13px] font-medium leading-relaxed opacity-60 mb-4">
              Subscribe to receive updates, access to exclusive deals, and more.
            </p>
              <form className="space-y-3" onSubmit={handleNewsletterSubmit}>
                <input 
                  type="email" 
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  className="w-full h-11 px-4 rounded-xl border text-[13px] font-medium outline-none focus:border-primary transition-colors"
                  style={{ borderColor: 'var(--store-border)' }}
                  autoComplete="email"
                  inputMode="email"
                  aria-label="Email address"
                />
                <button 
                  type="submit"
                  className="w-full h-11 text-white rounded-xl text-[13px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'var(--primary)' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--store-border)' }}>
          <p className="text-[11px] font-bold opacity-40">
            © {new Date().getFullYear()} {storeName}. All rights reserved. {footerNote}
          </p>
          <div className="flex items-center gap-6">
            <Link href={`/store/${merchant.subdomain}/privacy`} className="text-[11px] font-bold opacity-40 hover:opacity-100 transition-opacity">
              Privacy Policy
            </Link>
            <Link href={`/store/${merchant.subdomain}/terms`} className="text-[11px] font-bold opacity-40 hover:opacity-100 transition-opacity">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
