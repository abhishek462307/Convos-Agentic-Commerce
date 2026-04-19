"use client"

import React, { useEffect, useState } from 'react';
import {
  Search,
  Globe,
  Loader2,
  Save,
  Info,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

export default function SeoSettingsPage() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [googleId, setGoogleId] = useState('');
  const [bingId, setBingId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (merchant) {
      setGoogleId(merchant.google_search_console_id || '');
      setBingId(merchant.bing_verification_id || '');
    }
  }, [merchant]);

  const handleSave = async () => {
    if (!merchant) return;

    setSaving(true);
    const response = await fetch('/api/merchant/settings/update', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: {
          google_search_console_id: googleId.trim() || null,
          bing_verification_id: bingId.trim() || null,
        },
      }),
    });

    if (!response.ok) {
      toast.error('Failed to save SEO settings');
    } else {
      toast.success('SEO settings saved successfully');
      refetch();
    }
    setSaving(false);
  };

  if (merchantLoading) {
    return <MerchantPageSkeleton />;
  }

  const subdomain = merchant?.subdomain || 'your-store';
  const storeUrl = merchant?.custom_domain 
    ? `https://${merchant.custom_domain}` 
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}`;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Visibility</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Search Discovery</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">SEO & Discovery</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Configure your store for search engines and verify your domain ownership from a calm control surface.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Google Search Console */}
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <Search className="w-4 h-4 text-[#4285F4]" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Google Search Console</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Verify ownership and track your search performance on Google.</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="h-8 text-[11px] font-bold uppercase tracking-[0.12em] border-border/70 bg-background hover:bg-secondary/40 rounded-[12px]">
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                    Open GSC <ExternalLink className="w-3 h-3 ml-1.5" />
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Google Verification ID</Label>
                <Input
                  value={googleId}
                  onChange={(e) => setGoogleId(e.target.value)}
                  placeholder="e.g. google-site-verification=XXXXXXXXXXXXXXXXXXX"
                  className="h-11 bg-secondary/20 border-border/70 text-[14.5px] font-mono rounded-[12px] px-4"
                />
                <div className="flex items-start gap-3 p-4 bg-secondary/20 rounded-[16px] border border-border/70">
                  <Info className="w-4 h-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <p className="text-[13px] leading-relaxed text-muted-foreground/85">
                    Enter only the value inside the content attribute of your meta tag.
                    <br />
                    <span className="font-mono mt-1 block opacity-60">Example: google-site-verification=XXXXXXXXXXXXX</span>
                  </p>
                </div>
              </div>

              <div className="p-5 bg-emerald-500/5 rounded-[20px] border border-emerald-500/10 space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] flex items-center gap-2 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                  How to verify
                </h4>
                <ol className="text-[13px] leading-relaxed text-muted-foreground/85 space-y-2 list-decimal pl-5">
                  <li>Go to Google Search Console and add a new "URL Prefix" property for <span className="text-foreground font-mono">{storeUrl}</span></li>
                  <li>Choose "HTML Tag" as the verification method.</li>
                  <li>Copy the content value and paste it above.</li>
                  <li>Click Save here, then click "Verify" in Search Console.</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Bing Webmaster Tools */}
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <Globe className="w-4 h-4 text-[#00A4EF]" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Bing Webmaster Tools</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Reach more customers on Bing, Yahoo, and DuckDuckGo.</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="h-8 text-[11px] font-bold uppercase tracking-[0.12em] border-border/70 bg-background hover:bg-secondary/40 rounded-[12px]">
                  <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer">
                    Open Bing <ExternalLink className="w-3 h-3 ml-1.5" />
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Bing Verification ID</Label>
                <Input
                  value={bingId}
                  onChange={(e) => setBingId(e.target.value)}
                  placeholder="e.g. 1234567890ABCDEF1234567890ABCDEF"
                  className="h-11 bg-secondary/20 border-border/70 text-[14.5px] font-mono rounded-[12px] px-4"
                />
              </div>
            </CardContent>
          </Card>

          {/* Search Engine Presence */}
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Sitemap & Indexing</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Automated sitemap generation for your store.</CardDescription>
                  </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Sitemap URL</p>
                  <code className="text-[13px] text-foreground font-mono">{storeUrl}/sitemap.xml</code>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-[0.12em]">
                  Auto-Generated
                </Badge>
              </div>
              <p className="text-[13.5px] leading-relaxed text-muted-foreground mt-4">
                The app automatically generates and updates your sitemap.xml whenever you add products or categories. 
                Search engines will use this to discover all your pages.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
}
