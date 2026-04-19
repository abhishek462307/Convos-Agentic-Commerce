"use client"

import React, { useEffect, useState } from 'react';
import {
  Store,
  Globe,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';
import { Badge } from '@/components/ui/badge';

export default function StoreSettingsPage() {
  const { merchant: merchantContext, loading: merchantLoading, refetch } = useMerchant();
  const [merchant, setMerchant] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!merchantContext) {
      return;
    }

    setMerchant({
      ...merchantContext,
      store_email: merchantContext.store_email || '',
      store_industry: (merchantContext as any).store_industry || '',
    });
  }, [merchantContext]);

  const handleSave = async () => {
    if (!merchant?.store_name || !merchant?.store_email) {
      toast.error("Store name and email are required");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/merchant/settings/store', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: merchant.store_name,
          store_email: merchant.store_email,
          store_industry: merchant.store_industry,
          currency: merchant.currency,
          locale: merchant.locale,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save');
      }

      await refetch();
      toast.success("Settings saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading || !merchant) return <MerchantPageSkeleton />;

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">General</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Merchant Identity</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Store & Region</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Your store identity, contact info, and localization from a calm control surface.</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>

        <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                <Store className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold tracking-tight">Store Details</CardTitle>
                <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Basic information about your store.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="store_name" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Store name</Label>
                <Input
                  id="store_name"
                  value={merchant?.store_name || ''}
                  onChange={(e) => setMerchant({ ...merchant, store_name: e.target.value })}
                  className="h-11 bg-secondary/20 border-border/70 focus:ring-1 focus:ring-emerald-500/20 text-[14.5px] rounded-[12px] px-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_email" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Store email</Label>
                <Input
                  id="store_email"
                  value={merchant?.store_email || ''}
                  onChange={(e) => setMerchant({ ...merchant, store_email: e.target.value })}
                  className="h-11 bg-secondary/20 border-border/70 focus:ring-1 focus:ring-emerald-500/20 text-[14.5px] rounded-[12px] px-4"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_industry" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Industry</Label>
              <Select
                value={merchant?.store_industry || ''}
                onValueChange={(val) => setMerchant({ ...merchant, store_industry: val })}
              >
                <SelectTrigger id="store_industry" className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent className="rounded-[16px] border-border/70 bg-popover shadow-xl">
                  <SelectItem value="Fashion">Fashion & Apparel</SelectItem>
                  <SelectItem value="Beauty">Beauty & Personal Care</SelectItem>
                  <SelectItem value="Electronics">Electronics & Gadgets</SelectItem>
                  <SelectItem value="Home Decor">Home & Garden</SelectItem>
                  <SelectItem value="Food">Food & Beverage</SelectItem>
                  <SelectItem value="Health">Health & Wellness</SelectItem>
                  <SelectItem value="Sports">Sports & Outdoors</SelectItem>
                  <SelectItem value="Toys">Toys & Games</SelectItem>
                  <SelectItem value="Jewelry">Jewelry & Accessories</SelectItem>
                  <SelectItem value="Books">Books & Stationery</SelectItem>
                  <SelectItem value="Pet">Pet Supplies</SelectItem>
                  <SelectItem value="Automotive">Automotive & Parts</SelectItem>
                  <SelectItem value="Art">Art & Crafts</SelectItem>
                  <SelectItem value="Baby">Baby & Kids</SelectItem>
                  <SelectItem value="Music">Music & Instruments</SelectItem>
                  <SelectItem value="Furniture">Furniture & Decor</SelectItem>
                  <SelectItem value="Grocery">Grocery & Essentials</SelectItem>
                  <SelectItem value="Digital">Digital Products</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                  <SelectItem value="B2B">B2B / Wholesale</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                <Globe className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold tracking-tight">Region & Currency</CardTitle>
                <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">How prices and dates are displayed to your customers.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Currency</Label>
                <Select
                  value={merchant?.currency || 'USD'}
                  onValueChange={(val) => setMerchant({ ...merchant, currency: val })}
                >
                  <SelectTrigger id="currency" className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[16px] border-border/70 bg-popover shadow-xl">
                    <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                    <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                    <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar ($)</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locale" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Language & Format</Label>
                <Select
                  value={merchant?.locale || 'en-US'}
                  onValueChange={(val) => setMerchant({ ...merchant, locale: val })}
                >
                  <SelectTrigger id="locale" className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4">
                    <SelectValue placeholder="Select locale" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[16px] border-border/70 bg-popover shadow-xl">
                    <SelectItem value="en-US">English (United States)</SelectItem>
                    <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                    <SelectItem value="fr-FR">French (France)</SelectItem>
                    <SelectItem value="de-DE">German (Germany)</SelectItem>
                    <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                    <SelectItem value="ja-JP">Japanese (Japan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
