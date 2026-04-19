"use client"

import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import { 
  Palette, 
  Smartphone, 
  Monitor,
  Image as ImageIcon,
  Save,
  Loader2,
  Upload,
  X,
  Pipette,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Share2,
  AtSign,
  PlayCircle,
  Globe,
  FileText,
  Tag,
  Truck,
  Shield,
  RotateCcw,
  Lock,
  Clock,
  Zap,
  CheckCircle,
  Award,
  Heart,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Iphone15Pro from '@/components/ui/shadcn-io/iphone-15-pro';
import { HexColorPicker } from 'react-colorful';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { uploadFile } from '@/lib/storage';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import {
  getDefaultFooterPageDrafts,
  normalizeFooterPageDraft,
  slugifyFooterPageTitle,
  type FooterPageDraft,
  type FooterPageType,
} from '@/lib/storefront/footer-pages';
import {
  DEFAULT_FOOTER_LINKS,
  DEFAULT_NAVIGATION_LINKS,
  normalizeStorefrontLinkHref,
  type StorefrontLink,
} from '@/lib/storefront/navigation';

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Banner',
  promo_codes: 'Promo Codes',
  trust_cues: 'Trust Badges',
  categories: 'Categories',
  popular_products: 'Popular Products',
  best_sellers: 'Best Sellers',
  all_products: 'All Products',
  welcome_text: 'Welcome Text',
  newsletter: 'Newsletter',
};

const DEFAULT_TRUST_BADGES = [
  { icon: 'truck', label: 'Fast Delivery', desc: 'Quick & reliable shipping' },
  { icon: 'shield', label: 'Secure Checkout', desc: 'Your data is protected' },
  { icon: 'rotate-ccw', label: 'Easy Returns', desc: 'Hassle-free return policy' },
  { icon: 'lock', label: 'Trusted Store', desc: '100% secure payments' },
];

const DEFAULT_SECTIONS = [
  { id: 'hero', type: 'hero', enabled: true, content: { banners: [] } },
  { id: 'promo_codes', type: 'promo_codes', enabled: true },
  { id: 'trust_cues', type: 'trust_cues', enabled: true, content: { badges: DEFAULT_TRUST_BADGES } },
  { id: 'categories', type: 'categories', title: 'Browse by Category', enabled: true },
  { id: 'popular_products', type: 'popular_products', title: 'Popular Right Now', enabled: true },
  { id: 'best_sellers', type: 'best_sellers', title: 'Best Sellers', enabled: true },
  { id: 'all_products', type: 'all_products', title: 'All Products', enabled: true },
];

const DEFAULT_DESIGN = {
  logo_url: null,
  logo_url_desktop: null,
  logo_width_mobile: 80,
  logo_height_mobile: 80,
  logo_width_desktop: 120,
  logo_height_desktop: 40,
  logo_size: 80,
  cover_url_mobile: null,
  primary_color: '#000000',
  welcome_message: 'How can I help you today?',
  hero_title: 'What can I help you find today?',
  hero_subtitle: 'Ask me anything about our products, get personalized recommendations, or let me help you find the perfect item.',
  banners: [],
  socials: {},
  navigation_links: DEFAULT_NAVIGATION_LINKS,
  footer_links: DEFAULT_FOOTER_LINKS,
  footer_description: 'Conversational commerce with AI-led discovery, faster buying, and smarter support.',
  footer_note: 'Powered by your storefront',
  announcement_text: 'Free global shipping on orders over $100 | Use code WELCOME to get 10% off',
  store_address: '',
  store_description: '',
  sections: DEFAULT_SECTIONS,
  product_display_mode: 'grid' as const,
  template_id: 'minimal-light',
};

const normalizeLinkList = (links: unknown, fallback: StorefrontLink[]) => {
  const source = Array.isArray(links) ? links : fallback;

  return source.map((link, index) => {
    const current = (link || {}) as StorefrontLink;
    return {
      label: current.label?.trim() || fallback[index]?.label || `Link ${index + 1}`,
      href: normalizeStorefrontLinkHref(current.href || fallback[index]?.href || '/'),
      external: current.external ?? fallback[index]?.external,
      enabled: current.enabled !== false,
    };
  });
};

const createEmptyLink = (label: string, href: string): StorefrontLink => ({
  label,
  href,
  enabled: true,
});

const ICON_OPTIONS = [
  { value: 'truck', label: 'Truck', icon: Truck },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'rotate-ccw', label: 'Return', icon: RotateCcw },
  { value: 'lock', label: 'Lock', icon: Lock },
  { value: 'clock', label: 'Clock', icon: Clock },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'check-circle', label: 'Check', icon: CheckCircle },
  { value: 'award', label: 'Award', icon: Award },
  { value: 'heart', label: 'Heart', icon: Heart },
];

type EditorTab = 'branding' | 'sections' | 'footer-pages' | 'seo';

const MOBILE_PREVIEW_WIDTH = 390;
const MOBILE_PREVIEW_HEIGHT = Math.round((882 * MOBILE_PREVIEW_WIDTH) / 433);

export default function StoreDesignPage() {
  const router = useRouter();
  const { merchant, loading: merchantLoading } = useMerchant();
  const [design, setDesign] = useState<any>(null);
  const [footerPages, setFooterPages] = useState<FooterPageDraft[]>([]);
  const [selectedFooterPageId, setSelectedFooterPageId] = useState<string | null>(null);
  const [footerPagesLoading, setFooterPagesLoading] = useState(false);
  const [footerPagesLoaded, setFooterPagesLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('branding');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [expandedBanner, setExpandedBanner] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const previewContainerRef = React.useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Auto-scale mobile preview to fit viewport
  useEffect(() => {
    if (previewMode !== 'mobile') {
      setPreviewScale(1);
      return;
    }

    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const parent = previewContainerRef.current.parentElement;
      if (!parent) return;

      const parentWidth = parent.clientWidth - 48;
      const parentHeight = parent.clientHeight - 48;
      
      const phoneWidth = MOBILE_PREVIEW_WIDTH;
      const phoneHeight = MOBILE_PREVIEW_HEIGHT;

      const scaleX = parentWidth / phoneWidth;
      const scaleY = parentHeight / phoneHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      setPreviewScale(newScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (previewContainerRef.current?.parentElement) {
      observer.observe(previewContainerRef.current.parentElement);
    }

    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, [previewMode]);

  // Sync design state to iframe via postMessage and sessionStorage
  useEffect(() => {
    if (!merchant?.subdomain || !design) return;
    
    // Save to sessionStorage for initial load fallback
    sessionStorage.setItem(`store_preview_draft_${merchant.subdomain}`, JSON.stringify(design));
    
    // Send message to iframe if it's loaded
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'STORE_PREVIEW_UPDATE',
        design
      }, '*');
    }
  }, [design, merchant?.subdomain]);

  useEffect(() => {
    if (merchant) {
      const existing: any = merchant.branding_settings || {};
      const rawSections = existing.sections?.length > 0 
        ? existing.sections 
        : DEFAULT_SECTIONS;
      
      const seen = new Set<string>();
      const sections = (rawSections || []).filter((s: any) => {
        if (seen.has(s.type)) return false;
        seen.add(s.type);
        return true;
      });
      
      const heroBanners = sections.find((s: any) => s.type === 'hero')?.content?.banners || [];
      const rootBanners = existing.banners || [];
      const banners = heroBanners.length > 0 ? heroBanners : rootBanners;
      const navigationLinks = normalizeLinkList(existing.navigation_links, DEFAULT_NAVIGATION_LINKS);
      const footerLinks = normalizeLinkList(existing.footer_links, DEFAULT_FOOTER_LINKS);

      const syncedSections = sections.map((s: any) => 
        s.type === 'hero' ? { ...s, content: { ...s.content, banners } } : s
      );

      setDesign({
        ...DEFAULT_DESIGN,
        ...existing,
        sections: syncedSections,
        banners,
        socials: existing.socials || {},
        navigation_links: navigationLinks,
        footer_links: footerLinks,
        footer_description: existing.footer_description || DEFAULT_DESIGN.footer_description,
        footer_note: existing.footer_note || DEFAULT_DESIGN.footer_note,
        announcement_text: existing.announcement_text || DEFAULT_DESIGN.announcement_text,
        store_address: existing.store_address || '',
        store_description: existing.store_description || '',
        seo: existing.seo || {},
      });
    }
  }, [merchant]);

  useEffect(() => {
    if (!merchant) return;

    let cancelled = false;
    const merchantStoreName = merchant.store_name || 'Store';

    async function loadFooterPages() {
      setFooterPagesLoading(true);
      try {
        const response = await fetch('/api/merchant/footer-pages', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load footer pages');
        }

        const items = Array.isArray(payload.items) && payload.items.length > 0
          ? payload.items.map((page: FooterPageDraft, index: number) => normalizeFooterPageDraft(page, index))
          : getDefaultFooterPageDrafts(merchantStoreName);

        setFooterPages(items);
        setSelectedFooterPageId((current) => {
          if (current && items.some((page: FooterPageDraft) => page.id === current || page.slug === current)) return current;
          return null;
        });
        setFooterPagesLoaded(true);
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || 'Failed to load footer pages');
          const fallbackPages = getDefaultFooterPageDrafts(merchantStoreName);
          setFooterPages(fallbackPages);
          setSelectedFooterPageId(fallbackPages[0]?.id || fallbackPages[0]?.slug || null);
          setFooterPagesLoaded(true);
        }
      } finally {
        if (!cancelled) setFooterPagesLoading(false);
      }
    }

    loadFooterPages();

    return () => {
      cancelled = true;
    };
  }, [merchant]);

  const updateDesign = useCallback((updates: Record<string, any>) => {
    setDesign((prev: any) => ({ ...prev, ...updates }));
  }, []);

  const updateLinkList = useCallback((field: 'navigation_links' | 'footer_links', updater: (links: StorefrontLink[]) => StorefrontLink[]) => {
    setDesign((prev: any) => {
      const current = Array.isArray(prev?.[field]) ? prev[field] : [];
      return { ...prev, [field]: updater(current) };
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'logo_desktop' | 'cover_mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    try {
      const url = await uploadFile(file, 'merchant-assets', `branding/${merchant!.id}`);
      if (type === 'logo') updateDesign({ logo_url: url });
      else if (type === 'logo_desktop') updateDesign({ logo_url_desktop: url });
      else if (type === 'cover_mobile') updateDesign({ cover_url_mobile: url });
      toast.success(`${type.replace('_', ' ')} uploaded`);
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, bannerId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(`banner-${bannerId}`);
    try {
      const url = await uploadFile(file, 'merchant-assets', `banners/${merchant!.id}`);
      updateBanner(bannerId, 'image_url', url);
      toast.success('Banner image uploaded');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading('og_image');
    try {
      const url = await uploadFile(file, 'merchant-assets', `seo/${merchant!.id}`);
      updateDesign({ seo: { ...design.seo, og_image: url } });
      toast.success('OG image uploaded');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading('favicon');
    try {
      const url = await uploadFile(file, 'merchant-assets', `seo/${merchant!.id}`);
      updateDesign({ seo: { ...design.seo, favicon_url: url } });
      toast.success('Favicon uploaded');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const updateSections = useCallback((newSections: any[]) => {
    const heroBanners = newSections.find((s: any) => s.type === 'hero')?.content?.banners || [];
    setDesign((prev: any) => ({ ...prev, sections: newSections, banners: heroBanners }));
  }, []);

  const toggleSection = useCallback((id: string) => {
    setDesign((prev: any) => {
      const newSections = prev.sections.map((s: any) => s.id === id ? { ...s, enabled: !s.enabled } : s);
      return { ...prev, sections: newSections };
    });
  }, []);

  const moveSection = useCallback((index: number, direction: 'up' | 'down') => {
    setDesign((prev: any) => {
      const sections = [...prev.sections];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sections.length) return prev;
      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      return { ...prev, sections };
    });
  }, []);

  const addBanner = useCallback(() => {
    const newBanner = {
      id: `banner-${Date.now()}`,
      image_url: '',
      title: '',
      subtitle: '',
      button_text: '',
      button_link: '',
    };
    setDesign((prev: any) => {
      const sections = prev.sections.map((s: any) => {
        if (s.type === 'hero') {
          const banners = [...(s.content?.banners || []), newBanner];
          return { ...s, content: { ...s.content, banners } };
        }
        return s;
      });
      const banners = [...(prev.banners || []), newBanner];
      return { ...prev, sections, banners };
    });
    setExpandedBanner(newBanner.id);
  }, []);

  const removeBanner = useCallback((bannerId: string) => {
    setDesign((prev: any) => {
      const sections = prev.sections.map((s: any) => {
        if (s.type === 'hero') {
          const banners = (s.content?.banners || []).filter((b: any) => b.id !== bannerId);
          return { ...s, content: { ...s.content, banners } };
        }
        return s;
      });
      const banners = (prev.banners || []).filter((b: any) => b.id !== bannerId);
      return { ...prev, sections, banners };
    });
    if (expandedBanner === bannerId) setExpandedBanner(null);
  }, [expandedBanner]);

  const updateBanner = useCallback((bannerId: string, field: string, value: string) => {
    setDesign((prev: any) => {
      const updateBannerList = (list: any[]) => 
        list.map((b: any) => b.id === bannerId ? { ...b, [field]: value } : b);

      const sections = prev.sections.map((s: any) => {
        if (s.type === 'hero') {
          return { ...s, content: { ...s.content, banners: updateBannerList(s.content?.banners || []) } };
        }
        return s;
      });
      return { ...prev, sections, banners: updateBannerList(prev.banners || []) };
    });
  }, []);

  const updateFooterPage = useCallback((pageId: string, updates: Partial<FooterPageDraft>) => {
    setFooterPages((pages) => pages.map((page) => {
      if ((page.id || page.slug) !== pageId) return page;

      const nextTitle = typeof updates.title === 'string' && updates.title.trim()
        ? updates.title.trim()
        : page.title;
      const nextType = (updates.page_type || page.page_type) as FooterPageType;
      const nextSlug = typeof updates.slug === 'string' && updates.slug.trim()
        ? slugifyFooterPageTitle(updates.slug)
        : page.page_type === 'custom'
          ? slugifyFooterPageTitle(nextTitle)
          : page.slug;

      return {
        ...page,
        ...updates,
        title: nextTitle,
        page_type: nextType,
        slug: nextSlug || page.slug,
        enabled: updates.enabled ?? page.enabled,
        sort_order: typeof updates.sort_order === 'number' ? updates.sort_order : page.sort_order,
      };
    }));

    if (typeof updates.slug === 'string' && updates.slug.trim()) {
      setSelectedFooterPageId(slugifyFooterPageTitle(updates.slug));
    }
  }, []);

  const addFooterPage = useCallback(() => {
    const newPage = normalizeFooterPageDraft({
      page_type: 'custom',
      title: 'New Custom Page',
      slug: `custom-page-${Date.now()}`,
      content_markdown: '',
      enabled: true,
      sort_order: footerPages.length,
    }, footerPages.length);

    setFooterPages((pages) => [...pages, newPage]);
    setSelectedFooterPageId(newPage.id || newPage.slug);
    setActiveTab('footer-pages');
  }, [footerPages.length]);

  const removeFooterPage = useCallback((pageId: string) => {
    setFooterPages((pages) => pages.filter((page) => (page.id || page.slug) !== pageId));
    setSelectedFooterPageId((current) => current === pageId ? null : current);
  }, []);

  const moveFooterPage = useCallback((pageId: string, direction: 'up' | 'down') => {
    setFooterPages((pages) => {
      const index = pages.findIndex((page) => (page.id || page.slug) === pageId);
      if (index === -1) return pages;

      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= pages.length) return pages;

      const nextPages = [...pages];
      [nextPages[index], nextPages[nextIndex]] = [nextPages[nextIndex], nextPages[index]];
      return nextPages.map((page, order) => ({ ...page, sort_order: order }));
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const brandingResponse = await fetch('/api/merchant/settings/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { branding_settings: design } }),
      });

      const brandingPayload = await brandingResponse.json().catch(() => ({}));
      if (!brandingResponse.ok) throw new Error(brandingPayload.error || 'Failed to save branding');

      const pagesResponse = await fetch('/api/merchant/footer-pages', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: footerPages }),
      });

      const pagesPayload = await pagesResponse.json().catch(() => ({}));
      if (!pagesResponse.ok) throw new Error(pagesPayload.error || 'Failed to save footer pages');

      if (Array.isArray(pagesPayload.items)) {
        setFooterPages(pagesPayload.items.map((page: FooterPageDraft, index: number) => normalizeFooterPageDraft(page, index)));
      }

      toast.success('Store design saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading || !design) {
    return <MerchantPageSkeleton />;
  }

  const heroBanners = design.sections?.find((s: any) => s.type === 'hero')?.content?.banners || [];

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'branding', label: 'Branding' },
    { id: 'sections', label: 'Sections' },
    { id: 'footer-pages', label: 'Footer Pages' },
    { id: 'seo', label: 'SEO & Meta' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans">
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-background z-20">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Store Design</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Customize your agentic storefront appearance.</p>
            </div>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="h-10 bg-black hover:bg-black/90 text-white rounded-lg px-6 font-bold shadow-lg"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[380px] border-r border-border bg-background flex flex-col overflow-hidden">
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  activeTab === tab.id 
                    ? 'text-foreground border-b-2 border-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar pt-6 px-6 pb-32 space-y-8">
            {activeTab === 'branding' && (
              <BrandingTab 
                design={design} 
                updateDesign={updateDesign} 
                updateLinkList={updateLinkList}
                uploading={uploading}
                handleFileUpload={handleFileUpload}
              />
            )}

            {activeTab === 'sections' && (
              <SectionsTab
                design={design}
                updateDesign={updateDesign}
                toggleSection={toggleSection}
                moveSection={moveSection}
                heroBanners={heroBanners}
                addBanner={addBanner}
                removeBanner={removeBanner}
                updateBanner={updateBanner}
                expandedBanner={expandedBanner}
                setExpandedBanner={setExpandedBanner}
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
                uploading={uploading}
                handleBannerImageUpload={handleBannerImageUpload}
                onAddSection={(section: any) => {
                  const newSections = [...(design.sections || []), section];
                  updateSections(newSections);
                }}
              />
            )}

            {activeTab === 'footer-pages' && (
              <FooterPagesTab
                storeName={merchant!.store_name || 'Store'}
                pages={footerPages}
                selectedPageId={selectedFooterPageId}
                loading={footerPagesLoading}
                loaded={footerPagesLoaded}
                onSelectPage={setSelectedFooterPageId}
                onAddPage={addFooterPage}
                onRemovePage={removeFooterPage}
                onMovePage={moveFooterPage}
                onUpdatePage={updateFooterPage}
              />
            )}

            {activeTab === 'seo' && (
              <SeoTab
                design={design}
                updateDesign={updateDesign}
                uploading={uploading}
                handleOgImageUpload={handleOgImageUpload}
                handleFaviconUpload={handleFaviconUpload}
                storeName={merchant!.store_name}
                subdomain={merchant!.subdomain}
              />
            )}
          </div>
        </aside>

        <main className="flex-1 bg-secondary/10 flex flex-col overflow-hidden p-4 md:p-6">
          <div className="flex-1 flex flex-col max-w-[1640px] w-full mx-auto">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Real-time Preview</span>
              <div className="p-1 bg-black/10 rounded-2xl flex items-center gap-1 shadow-inner backdrop-blur-sm">
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                    previewMode === 'mobile' 
                      ? 'bg-white shadow-md text-black' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Mobile</span>
                </button>
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                    previewMode === 'desktop' 
                      ? 'bg-white shadow-md text-black' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Desktop</span>
                </button>
              </div>
            </div>

                <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0 p-4 md:p-6">
                  <div 
                    ref={previewContainerRef}
                    className={`relative overflow-hidden transition-all duration-700 ${
                      previewMode === 'mobile'
                        ? 'animate-in fade-in zoom-in-95'
                        : 'w-full h-full rounded-2xl border border-border bg-white shadow-[0_40px_100px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-bottom-8'
                    }`}
                    style={previewMode === 'mobile' ? {
                      width: `${Math.round(MOBILE_PREVIEW_WIDTH * previewScale)}px`,
                      height: `${Math.round(MOBILE_PREVIEW_HEIGHT * previewScale)}px`,
                      flexShrink: 0
                    } : undefined}
                  >
                  {previewMode === 'desktop' && (
                    <div className="h-10 border-b border-border bg-secondary/10 flex items-center px-4 gap-4 shrink-0">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      </div>
                      <div className="flex-1 max-w-md bg-white border border-border rounded-lg h-6 flex items-center px-3 text-[10px] text-muted-foreground font-medium truncate">
                        {merchant?.custom_domain || process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}
                      </div>
                    </div>
                  )}

                  {previewMode === 'mobile' ? (
                    merchant?.subdomain ? (
                      <Iphone15Pro
                        width={Math.round(MOBILE_PREVIEW_WIDTH * previewScale)}
                        iframeSrc={`/store/${merchant.subdomain}?preview=true`}
                        iframeRef={iframeRef}
                        onIframeLoad={() => {
                          try {
                            if (iframeRef.current?.contentDocument) {
                              const style = iframeRef.current.contentDocument.createElement('style');
                              style.textContent = `
                                [data-nextjs-scroll-focus-boundary],
                                [data-nextjs-toast-wrapper],
                                #next-web-vital-overlay,
                                .nextjs-static-indicator { display: none !important; }
                              `;
                              iframeRef.current.contentDocument.head.appendChild(style);
                            }
                          } catch {}
                        }}
                        className="drop-shadow-[0_32px_80px_rgba(0,0,0,0.22)]"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30" />
                      </div>
                    )
                  ) : (
                    <div className="flex-1 overflow-hidden">
                      {merchant?.subdomain ? (
                        <iframe
                          ref={iframeRef}
                          src={`/store/${merchant.subdomain}?preview=true`}
                          className="w-full h-full border-none no-scrollbar bg-white"
                          title="Store Preview"
                          onLoad={() => {
                            try {
                              if (iframeRef.current?.contentDocument) {
                                const style = iframeRef.current.contentDocument.createElement('style');
                                style.textContent = `
                                  [data-nextjs-scroll-focus-boundary],
                                  [data-nextjs-toast-wrapper],
                                  #next-web-vital-overlay,
                                  .nextjs-static-indicator { display: none !important; }
                                `;
                                iframeRef.current.contentDocument.head.appendChild(style);
                              }
                            } catch {}
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}



function BrandingTab({ design, updateDesign, updateLinkList, uploading, handleFileUpload }: {
  design: any;
  updateDesign: (u: Record<string, any>) => void;
  updateLinkList: (field: 'navigation_links' | 'footer_links', updater: (links: StorefrontLink[]) => StorefrontLink[]) => void;
  uploading: string | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'logo_desktop' | 'cover_mobile') => void;
}) {
  return (
    <div className="space-y-12">
      <div className="space-y-8">
        <Label className="text-xs font-medium text-muted-foreground">Visual Identity</Label>
          
        <div className="space-y-8 border-b pb-10 border-border">
          <div className="space-y-4">
            <Label className="text-xs font-bold">Mobile Logo</Label>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/30 shrink-0">
                {design.logo_url ? (
                  <img src={design.logo_url} alt="Mobile Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <input type="file" id="logo-mobile-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={uploading === 'logo'} />
                <Button variant="outline" className="w-full h-11 text-xs font-bold gap-2 rounded-xl" onClick={() => document.getElementById('logo-mobile-upload')?.click()} disabled={uploading === 'logo'}>
                  {uploading === 'logo' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Upload Mobile Logo
                </Button>
                {design.logo_url && (
                  <Button variant="ghost" className="w-full h-9 text-[10px] text-destructive hover:text-destructive font-bold gap-1" onClick={() => updateDesign({ logo_url: null })}>
                    <X className="w-3 h-3" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {design.logo_url && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold">Width</Label>
                  <span className="text-[10px] text-muted-foreground">{design.logo_width_mobile || 80}px</span>
                </div>
                <Slider
                  value={[design.logo_width_mobile || 80]}
                  min={20}
                  max={200}
                  step={2}
                  onValueChange={([val]) => updateDesign({ logo_width_mobile: val })}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold">Height</Label>
                  <span className="text-[10px] text-muted-foreground">{design.logo_height_mobile || 80}px</span>
                </div>
                <Slider
                  value={[design.logo_height_mobile || 80]}
                  min={20}
                  max={200}
                  step={2}
                  onValueChange={([val]) => updateDesign({ logo_height_mobile: val })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8 border-b pb-10 border-border">
          <div className="space-y-4">
            <Label className="text-xs font-bold">Desktop Logo (Web)</Label>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/30 shrink-0">
                {design.logo_url_desktop ? (
                  <img src={design.logo_url_desktop} alt="Desktop Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <input type="file" id="logo-desktop-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo_desktop')} disabled={uploading === 'logo_desktop'} />
                <Button variant="outline" className="w-full h-11 text-xs font-bold gap-2 rounded-xl" onClick={() => document.getElementById('logo-desktop-upload')?.click()} disabled={uploading === 'logo_desktop'}>
                  {uploading === 'logo_desktop' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Upload Desktop Logo
                </Button>
                {design.logo_url_desktop && (
                  <Button variant="ghost" className="w-full h-9 text-[10px] text-destructive hover:text-destructive font-bold gap-1" onClick={() => updateDesign({ logo_url_desktop: null })}>
                    <X className="w-3 h-3" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {(design.logo_url_desktop || design.logo_url) && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold">Width</Label>
                  <span className="text-[10px] text-muted-foreground">{design.logo_width_desktop || 120}px</span>
                </div>
                <Slider
                  value={[design.logo_width_desktop || 120]}
                  min={40}
                  max={300}
                  step={4}
                  onValueChange={([val]) => updateDesign({ logo_width_desktop: val })}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold">Height</Label>
                  <span className="text-[10px] text-muted-foreground">{design.logo_height_desktop || 40}px</span>
                </div>
                <Slider
                  value={[design.logo_height_desktop || 40]}
                  min={20}
                  max={200}
                  step={2}
                  onValueChange={([val]) => updateDesign({ logo_height_desktop: val })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-xs font-bold">Mobile Cover</Label>
          <div className="space-y-4">
            <div className="w-full aspect-[2/1] rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/30">
              {design.cover_url_mobile ? (
                <img src={design.cover_url_mobile} alt="Mobile Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <span className="text-[10px] text-muted-foreground">Recommended: 800x400</span>
                </div>
              )}
            </div>
            <input type="file" id="cover-mobile-upload" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover_mobile')} disabled={uploading === 'cover_mobile'} />
            <Button variant="outline" className="w-full h-11 text-xs font-bold gap-2 rounded-xl" onClick={() => document.getElementById('cover-mobile-upload')?.click()} disabled={uploading === 'cover_mobile'}>
              {uploading === 'cover_mobile' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Upload Mobile Cover
            </Button>
            {design.cover_url_mobile && (
              <Button variant="ghost" className="w-full h-9 text-[10px] text-destructive hover:text-destructive font-bold gap-1" onClick={() => updateDesign({ cover_url_mobile: null })}>
                <X className="w-3 h-3" /> Remove
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 pb-10 border-b border-border">
          <Label className="text-xs font-bold">Primary Color</Label>
          <div className="flex gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-14 h-12 p-1 rounded-xl border-2 border-border overflow-hidden shrink-0 shadow-sm">
                  <div className="w-full h-full rounded-lg" style={{ backgroundColor: design.primary_color || '#000000' }} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-fit p-4 bg-white border-border shadow-2xl rounded-2xl">
                <HexColorPicker color={design.primary_color || '#000000'} onChange={(color) => updateDesign({ primary_color: color })} />
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {['#000000', '#FFFFFF', '#FF385C', '#00D1FF', '#00FF85', '#FFB800', '#8F00FF', '#FF00C7', '#4285F4', '#34A853'].map((c) => (
                    <button key={c} className="w-7 h-7 rounded-full border border-black/5 transition-transform hover:scale-110 shadow-sm" style={{ backgroundColor: c }} onClick={() => updateDesign({ primary_color: c })} />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <div className="relative flex-1">
              <Pipette className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <Input 
                value={design.primary_color || '#000000'}
                onChange={(e) => updateDesign({ primary_color: e.target.value })}
                className="h-12 pl-10 bg-secondary/20 border-border font-mono text-xs uppercase rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <Label className="text-xs font-medium text-muted-foreground">Store Details</Label>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="announcement_text" className="text-xs font-bold">Announcement Bar</Label>
            <Input
              id="announcement_text"
              value={design.announcement_text || ''}
              onChange={(e) => updateDesign({ announcement_text: e.target.value })}
              className="h-12 bg-secondary/20 border-border text-sm rounded-xl px-4"
              placeholder="Free global shipping on orders over $100 | Use code WELCOME to get 10% off"
            />
            <p className="text-[10px] text-muted-foreground">This appears in the top announcement strip on your storefront header.</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="store_description" className="text-xs font-bold">Store Description (About)</Label>
            <Textarea 
              id="store_description"
              value={design.store_description || ''}
              onChange={(e) => updateDesign({ store_description: e.target.value })}
              className="min-h-[88px] bg-secondary/20 border-border text-sm resize-none rounded-xl p-4"
              placeholder="Briefly describe your store's mission or products."
            />
            <p className="text-[10px] text-muted-foreground">This appears in your store header card and helps with SEO.</p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="store_address" className="text-xs font-bold">Store Location (Address)</Label>
            <Input 
              id="store_address"
              value={design.store_address || ''}
              onChange={(e) => updateDesign({ store_address: e.target.value })}
              className="h-12 bg-secondary/20 border-border text-sm rounded-xl px-4"
              placeholder="123 Coffee Lane, Roaster District"
            />
            <p className="text-[10px] text-muted-foreground">This shows up in the header below your store name.</p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <Label className="text-xs font-medium text-muted-foreground">Agent Personality</Label>
        <div className="space-y-4">
          <Label htmlFor="welcome_message" className="text-xs font-bold">Welcome Message (Chat)</Label>
          <Input 
            id="welcome_message"
            value={design.welcome_message || ''}
            onChange={(e) => updateDesign({ welcome_message: e.target.value })}
            className="h-12 bg-secondary/20 border-border text-sm rounded-xl px-4"
            placeholder="How can I help you today?"
          />
        </div>
      </div>

      <div className="space-y-10">
        <Label className="text-xs font-medium text-muted-foreground">Web Storefront</Label>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="hero_title" className="text-xs font-bold">Hero Headline</Label>
            <Input 
              id="hero_title"
              value={design.hero_title || ''}
              onChange={(e) => updateDesign({ hero_title: e.target.value })}
              className="h-12 bg-secondary/20 border-border text-sm rounded-xl px-4"
              placeholder="What can I help you find today?"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="hero_subtitle" className="text-xs font-bold">Hero Subtext</Label>
            <Textarea 
              id="hero_subtitle"
              value={design.hero_subtitle || ''}
              onChange={(e) => updateDesign({ hero_subtitle: e.target.value })}
              className="min-h-[100px] bg-secondary/20 border-border text-sm resize-none rounded-xl p-4"
              placeholder="Ask me anything about our products..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <Label className="text-xs font-medium text-muted-foreground">Social Links</Label>
        <div className="space-y-4">
          {[
            { key: 'instagram', label: 'Instagram', icon: Share2, placeholder: 'https://instagram.com/...' },
            { key: 'twitter', label: 'X / Twitter', icon: AtSign, placeholder: 'https://x.com/...' },
            { key: 'facebook', label: 'Facebook', icon: Share2, placeholder: 'https://facebook.com/...' },
            { key: 'youtube', label: 'YouTube', icon: PlayCircle, placeholder: 'https://youtube.com/...' },
          ].map(({ key, icon: Icon, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl border border-border flex items-center justify-center shrink-0 bg-secondary/10">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input
                value={design.socials?.[key] || ''}
                onChange={(e) => updateDesign({ socials: { ...design.socials, [key]: e.target.value } })}
                className="h-11 text-sm border-border rounded-xl px-4"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        <Label className="text-xs font-medium text-muted-foreground">Navigation & Footer</Label>
        <div className="space-y-8">
          <LinkSettingsGroup
            title="Header Menu"
            description="These links appear in the storefront header and mobile menu."
            links={Array.isArray(design.navigation_links) ? design.navigation_links : DEFAULT_NAVIGATION_LINKS}
            onAddLink={() => updateLinkList('navigation_links', (links) => [...links, createEmptyLink('New Link', '')])}
            onRemoveLink={(index) => updateLinkList('navigation_links', (links) => links.filter((_, i) => i !== index))}
            onUpdateLink={(index, updates) => updateLinkList('navigation_links', (links) => links.map((link, i) => i === index ? {
              ...link,
              ...updates,
              href: updates.href !== undefined ? normalizeStorefrontLinkHref(updates.href) : link.href,
            } : link))}
            onMoveLink={(index, direction) => updateLinkList('navigation_links', (links) => {
              const nextIndex = direction === 'up' ? index - 1 : index + 1;
              if (nextIndex < 0 || nextIndex >= links.length) return links;
              const next = [...links];
              [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
              return next;
            })}
          />

          <LinkSettingsGroup
            title="Footer Links"
            description="These links appear in the storefront footer and should point at your managed policy or support pages."
            links={Array.isArray(design.footer_links) ? design.footer_links : DEFAULT_FOOTER_LINKS}
            onAddLink={() => updateLinkList('footer_links', (links) => [...links, createEmptyLink('New Link', '')])}
            onRemoveLink={(index) => updateLinkList('footer_links', (links) => links.filter((_, i) => i !== index))}
            onUpdateLink={(index, updates) => updateLinkList('footer_links', (links) => links.map((link, i) => i === index ? {
              ...link,
              ...updates,
              href: updates.href !== undefined ? normalizeStorefrontLinkHref(updates.href) : link.href,
            } : link))}
            onMoveLink={(index, direction) => updateLinkList('footer_links', (links) => {
              const nextIndex = direction === 'up' ? index - 1 : index + 1;
              if (nextIndex < 0 || nextIndex >= links.length) return links;
              const next = [...links];
              [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
              return next;
            })}
          />

          <div className="space-y-3">
            <Label htmlFor="footer_description" className="text-xs font-bold">Footer Description</Label>
            <Textarea
              id="footer_description"
              value={design.footer_description || ''}
              onChange={(e) => updateDesign({ footer_description: e.target.value })}
              className="min-h-[88px] bg-secondary/20 border-border text-sm resize-none rounded-xl p-4"
              placeholder="Conversational commerce with AI-led discovery, faster buying, and smarter support."
            />
            <p className="text-[10px] text-muted-foreground">
              This appears in the footer’s brand column above the footer links.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="footer_note" className="text-xs font-bold">Footer Note</Label>
            <Textarea
              id="footer_note"
              value={design.footer_note || ''}
              onChange={(e) => updateDesign({ footer_note: e.target.value })}
              className="min-h-[88px] bg-secondary/20 border-border text-sm resize-none rounded-xl p-4"
              placeholder="Powered by your storefront"
            />
            <p className="text-[10px] text-muted-foreground">
              This line appears at the bottom of the footer beside the copyright text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterPagesTab({
  storeName,
  pages,
  selectedPageId,
  loading,
  loaded,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onMovePage,
  onUpdatePage,
}: {
  storeName: string;
  pages: FooterPageDraft[];
  selectedPageId: string | null;
  loading: boolean;
  loaded: boolean;
  onSelectPage: (pageId: string | null) => void;
  onAddPage: () => void;
  onRemovePage: (pageId: string) => void;
  onMovePage: (pageId: string, direction: 'up' | 'down') => void;
  onUpdatePage: (pageId: string, updates: Partial<FooterPageDraft>) => void;
}) {
  const selectedPage = pages.find((page) => (page.id || page.slug) === selectedPageId);

  return (
    <div className="space-y-6">
      {!selectedPage ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Footer Pages</Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Manage the pages linked from the storefront footer. Default pages are preloaded for {storeName}, and custom pages can be added at any time.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-xs font-bold gap-2 rounded-2xl border-border bg-card shadow-sm hover:bg-secondary/40"
            onClick={onAddPage}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Page
          </Button>

          {loading && (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground animate-pulse text-center">
              Loading footer pages...
            </div>
          )}

          {!loading && loaded && pages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-medium">No footer pages yet.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Add a custom page to get started.</p>
            </div>
          )}

          <div className="space-y-3">
            {pages.map((page) => {
              const pageId = page.id || page.slug;

              return (
                <button
                  key={pageId}
                  type="button"
                  onClick={() => onSelectPage(pageId)}
                  className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-foreground/20 hover:bg-secondary/10 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{page.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground truncate">/{page.slug}</p>
                    </div>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground bg-secondary/20">
                      {page.page_type}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                      <span className={`h-2 w-2 rounded-full ${page.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-muted-foreground/30'}`} />
                      {page.enabled ? 'Visible' : 'Hidden'}
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground/30 -rotate-90" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/30 transition-all"
                onClick={() => onSelectPage(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <p className="text-sm font-bold tracking-tight">{selectedPage.title}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mt-0.5">Edit Footer Page</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMovePage(selectedPage.id || selectedPage.slug, 'up')}
                disabled={pages.findIndex((page) => (page.id || page.slug) === (selectedPage.id || selectedPage.slug)) === 0}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-all disabled:opacity-20"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onMovePage(selectedPage.id || selectedPage.slug, 'down')}
                disabled={pages.findIndex((page) => (page.id || page.slug) === (selectedPage.id || selectedPage.slug)) === pages.length - 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-all disabled:opacity-20"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Page Identity</Label>
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold">Title</Label>
                    <Input
                      value={selectedPage.title}
                      onChange={(e) => onUpdatePage(selectedPage.id || selectedPage.slug, { title: e.target.value })}
                      className="h-11 rounded-xl text-sm border-border bg-secondary/5"
                      placeholder="Privacy Policy"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold">Slug</Label>
                    <Input
                      value={selectedPage.slug}
                      onChange={(e) => onUpdatePage(selectedPage.id || selectedPage.slug, { slug: e.target.value })}
                      className="h-11 rounded-xl text-sm border-border bg-secondary/5"
                      placeholder="privacy-policy"
                      disabled={selectedPage.page_type !== 'custom'}
                    />
                    {selectedPage.page_type !== 'custom' && (
                      <p className="text-[9px] text-muted-foreground font-medium">Fixed pages keep their default route.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">SEO Settings</Label>
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold">SEO Title</Label>
                    <Input
                      value={selectedPage.seo_title || ''}
                      onChange={(e) => onUpdatePage(selectedPage.id || selectedPage.slug, { seo_title: e.target.value })}
                      className="h-11 rounded-xl text-sm border-border bg-secondary/5"
                      placeholder={`${selectedPage.title} | ${storeName}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold">SEO Description</Label>
                    <Input
                      value={selectedPage.seo_description || ''}
                      onChange={(e) => onUpdatePage(selectedPage.id || selectedPage.slug, { seo_description: e.target.value })}
                      className="h-11 rounded-xl text-sm border-border bg-secondary/5"
                      placeholder="Short page summary for search engines."
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/5 px-4 py-4">
                <div>
                  <p className="text-xs font-bold">Visible in footer</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Hide to remove from navigation while keeping content.</p>
                </div>
                <Switch
                  checked={selectedPage.enabled}
                  onCheckedChange={(checked) => onUpdatePage(selectedPage.id || selectedPage.slug, { enabled: checked })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Content</Label>
                <Textarea
                  value={selectedPage.content_markdown}
                  onChange={(e) => onUpdatePage(selectedPage.id || selectedPage.slug, { content_markdown: e.target.value })}
                  className="min-h-[320px] rounded-2xl border-border bg-secondary/5 p-5 text-sm resize-y leading-relaxed"
                  placeholder="Write the page content in markdown..."
                />
              </div>

              <div className="rounded-2xl border border-border bg-secondary/5 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Markdown Preview</p>
                </div>
                <div className="prose prose-sm max-w-none prose-headings:font-bold prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-inherit">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedPage.content_markdown || 'Start writing markdown content for this page.'}
                  </ReactMarkdown>
                </div>
              </div>

              {selectedPage.page_type === 'custom' && (
                <div className="pt-4 border-t border-border mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-11 text-xs text-destructive hover:text-destructive hover:bg-destructive/5 font-bold gap-2 rounded-xl"
                    onClick={() => onRemovePage(selectedPage.id || selectedPage.slug)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Page
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkSettingsGroup({
  title,
  description,
  links,
  onAddLink,
  onRemoveLink,
  onUpdateLink,
  onMoveLink,
}: {
  title: string;
  description: string;
  links: StorefrontLink[];
  onAddLink: () => void;
  onRemoveLink: (index: number) => void;
  onUpdateLink: (index: number, updates: Partial<StorefrontLink>) => void;
  onMoveLink: (index: number, direction: 'up' | 'down') => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3">
        {links.map((link, index) => (
          <div key={`${title}-${index}`} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Link {index + 1}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onMoveLink(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-secondary disabled:opacity-20"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveLink(index, 'down')}
                  disabled={index === links.length - 1}
                  className="p-1 rounded hover:bg-secondary disabled:opacity-20"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <Switch
                  checked={link.enabled !== false}
                  onCheckedChange={(checked) => onUpdateLink(index, { enabled: checked })}
                  className="scale-75"
                />
              </div>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground">Label</Label>
                <Input
                  value={link.label || ''}
                  onChange={(e) => onUpdateLink(index, { label: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                  placeholder="Shop"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground">Path or URL</Label>
                <Input
                  value={link.href || ''}
                  onChange={(e) => onUpdateLink(index, { href: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                  placeholder="/shop or https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">Leave disabled links in place for later reuse.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-[10px] text-destructive hover:text-destructive font-bold gap-1 px-2"
                onClick={() => onRemoveLink(index)}
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-10 text-xs font-bold gap-2 rounded-xl"
        onClick={onAddLink}
      >
        <Plus className="w-3 h-3" />
        Add Link
      </Button>
    </div>
  );
}

function SectionsTab({ design, updateDesign, toggleSection, moveSection, heroBanners, addBanner, removeBanner, updateBanner, expandedBanner, setExpandedBanner, expandedSection, setExpandedSection, uploading, handleBannerImageUpload, onAddSection }: {
  design: any;
  updateDesign: (u: Record<string, any>) => void;
  toggleSection: (id: string) => void;
  moveSection: (index: number, direction: 'up' | 'down') => void;
  heroBanners: any[];
  addBanner: () => void;
  removeBanner: (id: string) => void;
  updateBanner: (id: string, field: string, value: string) => void;
  expandedBanner: string | null;
  setExpandedBanner: (id: string | null) => void;
  expandedSection: string | null;
  setExpandedSection: (id: string | null) => void;
  uploading: string | null;
  handleBannerImageUpload: (e: React.ChangeEvent<HTMLInputElement>, bannerId: string) => void;
  onAddSection: (section: any) => void;
}) {
  const sections = design.sections || [];

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Section Order & Visibility</Label>
        <p className="text-[11px] text-muted-foreground">Toggle sections on/off and reorder them.</p>
      </div>

      <div className="space-y-4">
        {sections.map((section: any, index: number) => (
          <div key={section.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3.5">
              <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
              <div 
                className="flex-1 min-w-0 cursor-pointer group"
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              >
                <span className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{SECTION_LABELS[section.type] || section.type}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => moveSection(index, 'up')} 
                  disabled={index === 0} 
                  className="p-1 rounded hover:bg-secondary disabled:opacity-20"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => moveSection(index, 'down')} 
                  disabled={index === sections.length - 1} 
                  className="p-1 rounded hover:bg-secondary disabled:opacity-20"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <Switch 
                  checked={section.enabled} 
                  onCheckedChange={() => toggleSection(section.id)} 
                  className="ml-2 scale-75"
                />
              </div>
            </div>

            {expandedSection === section.id && section.enabled && (
              <div className="border-t border-border px-3 py-3 space-y-4">
                {section.type === 'hero' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Carousel Banners ({heroBanners.length})</span>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold gap-1" onClick={addBanner}>
                        <Plus className="w-3 h-3" /> Add Banner
                      </Button>
                    </div>

                    {heroBanners.length === 0 && (
                      <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
                        <p className="text-[11px] text-muted-foreground">No banners yet. Add one to show in the hero carousel.</p>
                      </div>
                    )}

                    {heroBanners.map((banner: any, bIdx: number) => (
                      <div key={banner.id} className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
                        <div
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedBanner(expandedBanner === banner.id ? null : banner.id)}
                        >
                          <div className="w-10 h-7 rounded border border-border overflow-hidden bg-secondary shrink-0">
                            {banner.image_url ? (
                              <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] font-bold flex-1 truncate">{banner.title || `Banner ${bIdx + 1}`}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeBanner(banner.id); }}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedBanner === banner.id ? 'rotate-180' : ''}`} />
                        </div>

                        {expandedBanner === banner.id && (
                          <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-muted-foreground">Image</Label>
                              <div className="w-full aspect-[2.5/1] rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/50">
                                {banner.image_url ? (
                                  <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                                )}
                              </div>
                              <input type="file" id={`banner-upload-${banner.id}`} className="hidden" accept="image/*" onChange={(e) => handleBannerImageUpload(e, banner.id)} />
                              <Button variant="outline" className="w-full h-8 text-[10px] font-bold gap-1" onClick={() => document.getElementById(`banner-upload-${banner.id}`)?.click()} disabled={uploading === `banner-${banner.id}`}>
                                {uploading === `banner-${banner.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                Upload Image
                              </Button>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-muted-foreground">Title</Label>
                              <Input value={banner.title || ''} onChange={(e) => updateBanner(banner.id, 'title', e.target.value)} className="h-8 text-xs" placeholder="Banner headline..." />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-muted-foreground">Subtitle</Label>
                              <Input value={banner.subtitle || ''} onChange={(e) => updateBanner(banner.id, 'subtitle', e.target.value)} className="h-8 text-xs" placeholder="Short description..." />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-muted-foreground">Button Text</Label>
                                <Input value={banner.button_text || ''} onChange={(e) => updateBanner(banner.id, 'button_text', e.target.value)} className="h-8 text-xs" placeholder="Shop Now" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-muted-foreground">Button Link</Label>
                                <Input value={banner.button_link || ''} onChange={(e) => updateBanner(banner.id, 'button_link', e.target.value)} className="h-8 text-xs" placeholder="/category/..." />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {section.type === 'trust_cues' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Custom Badges</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-[10px] font-bold gap-1"
                        onClick={() => {
                          const badges = [...(section.content?.badges || []), { icon: 'check-circle', label: 'New Badge', desc: 'Badge description' }];
                          const newSections = design.sections.map((s: any) => s.id === section.id ? { ...s, content: { ...s.content, badges } } : s);
                          updateDesign({ sections: newSections });
                        }}
                      >
                        <Plus className="w-3 h-3" /> Add Badge
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(section.content?.badges || DEFAULT_TRUST_BADGES).map((badge: any, bIdx: number) => (
                        <div key={bIdx} className="p-3 rounded-lg border border-border bg-secondary/20 space-y-3 relative group/badge">
                          <button 
                            className="absolute top-2 right-2 p-1 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/badge:opacity-100 transition-opacity"
                            onClick={() => {
                              const badges = (section.content?.badges || []).filter((_: any, i: number) => i !== bIdx);
                              const newSections = design.sections.map((s: any) => s.id === section.id ? { ...s, content: { ...s.content, badges } } : s);
                              updateDesign({ sections: newSections });
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-muted-foreground">Icon</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full h-8 px-2 justify-start gap-2">
                                    {React.createElement(ICON_OPTIONS.find(opt => opt.value === badge.icon)?.icon || Truck, { className: 'w-3.5 h-3.5' })}
                                    <span className="text-xs truncate">{ICON_OPTIONS.find(opt => opt.value === badge.icon)?.label || 'Truck'}</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2 grid grid-cols-3 gap-1">
                                  {ICON_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      className={`p-2 rounded-md hover:bg-secondary flex flex-col items-center gap-1 transition-colors ${badge.icon === opt.value ? 'bg-secondary' : ''}`}
                                      onClick={() => {
                                        const badges = (section.content?.badges || []).map((b: any, i: number) => i === bIdx ? { ...b, icon: opt.value } : b);
                                        const newSections = design.sections.map((s: any) => s.id === section.id ? { ...s, content: { ...s.content, badges } } : s);
                                        updateDesign({ sections: newSections });
                                      }}
                                    >
                                      <opt.icon className="w-4 h-4" />
                                      <span className="text-[8px] font-bold uppercase truncate w-full text-center">{opt.label}</span>
                                    </button>
                                  ))}
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-muted-foreground">Label</Label>
                              <Input 
                                value={badge.label} 
                                onChange={(e) => {
                                  const badges = (section.content?.badges || []).map((b: any, i: number) => i === bIdx ? { ...b, label: e.target.value } : b);
                                  const newSections = design.sections.map((s: any) => s.id === section.id ? { ...s, content: { ...s.content, badges } } : s);
                                  updateDesign({ sections: newSections });
                                }}
                                className="h-8 text-xs" 
                                placeholder="Fast Delivery" 
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground">Description</Label>
                            <Input 
                              value={badge.desc} 
                              onChange={(e) => {
                                const badges = (section.content?.badges || []).map((b: any, i: number) => i === bIdx ? { ...b, desc: e.target.value } : b);
                                const newSections = design.sections.map((s: any) => s.id === section.id ? { ...s, content: { ...s.content, badges } } : s);
                                updateDesign({ sections: newSections });
                              }}
                              className="h-8 text-xs" 
                              placeholder="Quick & reliable shipping" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Label className="text-xs font-medium text-muted-foreground mb-3 block">Add Section</Label>
        <div className="flex flex-wrap gap-2">
          {['welcome_text', 'newsletter'].map((type) => {
            const exists = sections.some((s: any) => s.type === type);
            if (exists) return null;
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-bold gap-1"
                onClick={() => {
                  onAddSection({
                    id: `${type}-${Date.now()}`,
                    type,
                    enabled: true,
                    title: type === 'welcome_text' ? 'Welcome to our store' : 'Stay Updated',
                    content: type === 'welcome_text' ? { text: 'Discover our curated collection.' } : { title: 'Join the Club', subtitle: 'Get exclusive access to new drops and early sales.' },
                  });
                }}
              >
                <Plus className="w-3 h-3" /> {SECTION_LABELS[type]}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SeoTab({ design, updateDesign, uploading, handleOgImageUpload, handleFaviconUpload, storeName, subdomain }: {
  design: any;
  updateDesign: (u: Record<string, any>) => void;
  uploading: string | null;
  handleOgImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFaviconUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  storeName: string;
  subdomain: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  const deploymentUrl = appUrl || 'https://your-domain.com';
  const storeUrl = subdomain ? `${deploymentUrl}/store/${subdomain}` : deploymentUrl;
  const seo = design.seo || {};

  const updateSeo = (field: string, value: string) => {
    updateDesign({ seo: { ...seo, [field]: value } });
  };

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Search Engine Optimization</Label>
        <p className="text-[11px] text-muted-foreground">Control how your store appears in search results and social media shares.</p>
      </div>

      <div className="space-y-10">
        <div className="space-y-4">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            Meta Title
          </Label>
          <Input
            value={seo.meta_title || ''}
            onChange={(e) => updateSeo('meta_title', e.target.value)}
            className="h-12 bg-secondary/20 border-border text-sm rounded-xl px-4"
            placeholder={storeName || 'Your Store Name'}
          />
          <p className="text-[10px] text-muted-foreground">
            {(seo.meta_title || '').length}/60 characters recommended
          </p>
        </div>

        <div className="space-y-4">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            Meta Description
          </Label>
          <Textarea
            value={seo.meta_description || ''}
            onChange={(e) => updateSeo('meta_description', e.target.value)}
            className="min-h-[100px] bg-secondary/20 border-border text-sm resize-none rounded-xl p-4"
            placeholder={`Shop the best products at ${storeName}`}
          />
          <p className="text-[10px] text-muted-foreground">
            {(seo.meta_description || '').length}/160 characters recommended
          </p>
        </div>

        <div className="space-y-4">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            Keywords
          </Label>
          <Input
            value={seo.keywords || ''}
            onChange={(e) => updateSeo('keywords', e.target.value)}
            className="h-12 bg-secondary/20 border-border text-sm rounded-xl px-4"
            placeholder="online store, fashion, electronics..."
          />
          <p className="text-[10px] text-muted-foreground">Comma-separated keywords for search engines.</p>
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <Label className="text-xs font-medium text-muted-foreground">Social Sharing</Label>
        <p className="text-[11px] text-muted-foreground">Customize how your store looks when shared on social media.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
            OG Image
          </Label>
          <div className="w-full aspect-[1.91/1] rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/30">
            {seo.og_image ? (
              <img src={seo.og_image} alt="OG Image" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1" />
                <span className="text-[10px] text-muted-foreground">Recommended: 1200x630</span>
              </div>
            )}
          </div>
          <input type="file" id="og-image-upload" className="hidden" accept="image/*" onChange={handleOgImageUpload} disabled={uploading === 'og_image'} />
          <Button variant="outline" className="w-full h-9 text-xs font-bold gap-2" onClick={() => document.getElementById('og-image-upload')?.click()} disabled={uploading === 'og_image'}>
            {uploading === 'og_image' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload OG Image
          </Button>
          {seo.og_image && (
            <Button variant="ghost" className="w-full h-8 text-[10px] text-destructive hover:text-destructive font-bold gap-1" onClick={() => updateSeo('og_image', '')}>
              <X className="w-3 h-3" /> Remove
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground">This image appears when your store link is shared on Facebook, Twitter, WhatsApp, etc.</p>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            Favicon
          </Label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/30">
              {seo.favicon_url ? (
                <img src={seo.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
              ) : (
                <Globe className="w-6 h-6 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input type="file" id="favicon-upload" className="hidden" accept="image/*" onChange={handleFaviconUpload} disabled={uploading === 'favicon'} />
              <Button variant="outline" className="w-full h-9 text-xs font-bold gap-2" onClick={() => document.getElementById('favicon-upload')?.click()} disabled={uploading === 'favicon'}>
                {uploading === 'favicon' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Upload Favicon
              </Button>
              {seo.favicon_url && (
                <Button variant="ghost" className="w-full h-8 text-[10px] text-destructive hover:text-destructive font-bold gap-1" onClick={() => updateSeo('favicon_url', '')}>
                  <X className="w-3 h-3" /> Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">32x32 or 64x64 icon shown in browser tabs.</p>
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          {seo.favicon_url ? (
            <img src={seo.favicon_url} alt="" className="w-4 h-4 rounded-sm object-contain" />
          ) : (
            <Globe className="w-4 h-4 text-muted-foreground/50" />
          )}
          <span className="text-[11px] text-muted-foreground truncate">
            {storeUrl}
          </span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-700 truncate">{seo.meta_title || storeName}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {seo.meta_description || `Shop the best products at ${storeName}`}
          </p>
        </div>
        {seo.og_image && (
          <div className="w-full aspect-[1.91/1] rounded-lg overflow-hidden border border-border">
            <img src={seo.og_image} alt="OG Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
