"use client"

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail, MapPin, Phone, RotateCcw, Truck, Globe, Shield, FileText, ShoppingBag } from 'lucide-react';
import {
  getFooterPageFallbackMarkdown,
  normalizeFooterPageDraft,
  type FooterPageDraft,
  type FooterPageType,
} from '@/lib/storefront/footer-pages';
import { useStoreData } from '@/providers/storefront';
import StorefrontShell from '../StorefrontShell';

type InfoVariant = 'about' | 'shipping' | 'returns' | 'contact' | 'privacy' | 'terms' | 'custom';

type StorefrontInfoPageProps = {
  subdomain: string;
  variant: InfoVariant;
  slug?: string;
};

const SHIPPING_ICON = Truck;
const RETURNS_ICON = RotateCcw;
const ABOUT_ICON = Globe;
const CONTACT_ICON = Mail;
const PRIVACY_ICON = Shield;
const TERMS_ICON = FileText;

const PAGE_TYPE_MAP: Record<Exclude<InfoVariant, 'shipping' | 'contact'>, FooterPageType> = {
  about: 'about',
  returns: 'returns',
  privacy: 'privacy',
  terms: 'terms',
  custom: 'custom',
};

function titleFromSlug(slug?: string) {
  if (!slug) return 'Custom Page';
  return slug
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StorefrontInfoPage({ subdomain, variant, slug }: StorefrontInfoPageProps) {
  return (
    <StorefrontShell subdomain={subdomain}>
      <StorefrontInfoContent subdomain={subdomain} variant={variant} slug={slug} />
    </StorefrontShell>
  );
}

function StorefrontInfoContent({ subdomain, variant, slug }: StorefrontInfoPageProps) {
  const { merchant, loading: dataLoading } = useStoreData();
  const [footerPage, setFooterPage] = useState<FooterPageDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      if (!merchant) return;
      setLoading(true);

      if (variant !== 'shipping' && variant !== 'contact') {
        const lookupType = variant === 'custom' ? 'slug' : 'page_type';
        const lookupValue = variant === 'custom' ? slug : PAGE_TYPE_MAP[variant];

        if (lookupValue) {
          const { data: pageData } = await supabase
            .from('merchant_footer_pages')
            .select('*')
            .eq('merchant_id', merchant.id)
            .eq(lookupType, lookupValue)
            .maybeSingle();

          if (!cancelled && pageData) {
            setFooterPage(normalizeFooterPageDraft(pageData as FooterPageDraft));
          }
        }
      }

      setLoading(false);
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [merchant, variant, slug]);

  const storeName = merchant?.store_name || subdomain;

  const counts = useMemo(() => {
    const zones = Array.isArray(merchant?.shipping_settings?.zones) ? merchant.shipping_settings.zones : [];
    const rates = zones.flatMap((zone: any) => Array.isArray(zone.rates) ? zone.rates : []);
    return {
      zones: zones.length,
      rates: rates.length,
    };
  }, [merchant]);

  if (loading || dataLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="text-[11px] font-black uppercase tracking-widest text-gray-300 animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!merchant) return null;

  const email = merchant.store_email || merchant.email || null;
  const phone = merchant.phone || null;
  const address = merchant.business_address || (merchant.branding_settings as any)?.address || null;
  const fallbackMarkdown = (() => {
    if (variant === 'shipping') {
      return `Shipping is configured for ${counts.zones} zone${counts.zones === 1 ? '' : 's'} and ${counts.rates} rate${counts.rates === 1 ? '' : 's'}. Final charges and delivery estimates are shown at checkout.`;
    }

    if (variant === 'contact') {
      return 'Reach out directly using the contact options below.';
    }

    return getFooterPageFallbackMarkdown(PAGE_TYPE_MAP[variant], storeName);
  })();

  const pageTitle = footerPage?.title || (
    variant === 'about'
      ? `About ${storeName}`
      : variant === 'shipping'
        ? 'Shipping Information'
        : variant === 'returns'
          ? 'Returns & Refunds'
          : variant === 'privacy'
            ? 'Privacy Policy'
            : variant === 'terms'
              ? 'Terms of Service'
              : variant === 'contact'
                ? 'Contact Us'
                : titleFromSlug(slug)
  );

  const pageMarkdown = footerPage?.content_markdown?.trim() || fallbackMarkdown;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-24">
      <div className="flex flex-col">
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-[0.5px] w-12 bg-black" />
            <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">
              {variant}
            </p>
          </div>

          <h1 className="text-[40px] md:text-[72px] font-black uppercase tracking-tighter leading-[0.9] mb-12">
            {pageTitle}
          </h1>
        </div>

        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ children, ...props }) => (
                <a {...props} className="font-black text-black underline underline-offset-4 decoration-1 hover:opacity-50 transition-opacity">
                  {children}
                </a>
              ),
              h2: ({ children }) => <h2 className="mt-20 mb-8 text-[18px] font-black uppercase tracking-[0.2em] border-b border-black pb-4 inline-block">{children}</h2>,
              h3: ({ children }) => <h3 className="mt-12 mb-6 text-[14px] font-black uppercase tracking-widest">{children}</h3>,
              p: ({ children }) => <p className="mb-8 text-[16px] md:text-[18px] leading-relaxed text-gray-900 font-medium tracking-tight">{children}</p>,
              ul: ({ children }) => <ul className="mb-10 ml-0 space-y-4 text-[16px] md:text-[18px] text-gray-900 font-medium tracking-tight">{children}</ul>,
              ol: ({ children }) => <ol className="mb-10 ml-0 space-y-4 text-[16px] md:text-[18px] text-gray-900 font-medium tracking-tight">{children}</ol>,
              li: ({ children }) => (
                <li className="flex gap-4">
                  <span className="shrink-0 font-black text-black">—</span>
                  <span>{children}</span>
                </li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-[2px] border-black pl-8 italic mb-10 text-[20px] text-black font-medium tracking-tight">
                  {children}
                </blockquote>
              ),
            }}
          >
            {pageMarkdown}
          </ReactMarkdown>
        </div>

        {variant === 'contact' && (
          <div className="grid gap-12 mt-24 pt-24 border-t border-gray-100">
            {email && <ContactItem label="Email" value={email} href={`mailto:${email}`} />}
            {phone && <ContactItem label="Phone" value={phone} href={`tel:${phone}`} />}
            {address && <ContactItem label="Address" value={address} />}
            {!email && !phone && !address && (
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-300">No contact details configured.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactItem({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="group">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20 mb-4">{label}</p>
      <p className="text-[24px] md:text-[32px] font-black uppercase tracking-tight group-hover:opacity-50 transition-opacity underline-offset-8 decoration-1 decoration-transparent group-hover:decoration-black underline">{value}</p>
    </div>
  );

  if (href) return <a href={href}>{content}</a>;
  return content;
}
