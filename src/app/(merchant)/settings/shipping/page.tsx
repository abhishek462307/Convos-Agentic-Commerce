"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const STATIC_CARRIERS = [
  { id: 'usps', name: 'USPS', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/United_States_Postal_Service_Logo.svg/1200px-United_States_Postal_Service_Logo.svg.png', countries: ['US'] },
  { id: 'royal-mail', name: 'Royal Mail', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Royal_Mail_logo.svg/1200px-Royal_Mail_logo.svg.png', countries: ['GB'] },
  { id: 'delhivery', name: 'Delhivery', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0d/Delhivery_company_logo.png/200px-Delhivery_company_logo.png', countries: ['IN'] },
  { id: 'australia-post', name: 'Australia Post', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Australia_Post_logo_%282021%29.svg/1200px-Australia_Post_logo_%282021%29.svg.png', countries: ['AU'] },
  { id: 'dhl-express', name: 'DHL Express', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/DHL_Logo.svg/1200px-DHL_Logo.svg.png', countries: ['*'] },
];
import { 
  ChevronLeft,
  Truck,
  Plus,
  Trash2,
  Globe,
  Percent,
  Check,
  MapPin,
  Search,
  X,
  Loader2,
  ArrowRight,
  Coins
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  min_value?: number;
  max_value?: number;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  rates: ShippingRate[];
}

interface ShippingSettings {
  zones: ShippingZone[];
}

interface CountryTaxRate {
  country_code: string;
  country_name: string;
  rate: number;
  tax_name?: string;
}

interface TaxSettings {
  enabled: boolean;
  default_rate: number;
  include_in_price: boolean;
  country_rates: CountryTaxRate[];
}

const COUNTRIES = [
  { code: 'US', name: 'United States', defaultTax: 0, taxName: 'Sales Tax' },
  { code: 'CA', name: 'Canada', defaultTax: 5, taxName: 'GST' },
  { code: 'GB', name: 'United Kingdom', defaultTax: 20, taxName: 'VAT' },
  { code: 'DE', name: 'Germany', defaultTax: 19, taxName: 'MwSt' },
  { code: 'FR', name: 'France', defaultTax: 20, taxName: 'TVA' },
  { code: 'IT', name: 'Italy', defaultTax: 22, taxName: 'IVA' },
  { code: 'ES', name: 'Spain', defaultTax: 21, taxName: 'IVA' },
  { code: 'NL', name: 'Netherlands', defaultTax: 21, taxName: 'BTW' },
  { code: 'BE', name: 'Belgium', defaultTax: 21, taxName: 'TVA/BTW' },
  { code: 'AT', name: 'Austria', defaultTax: 20, taxName: 'MwSt' },
  { code: 'PT', name: 'Portugal', defaultTax: 23, taxName: 'IVA' },
  { code: 'SE', name: 'Sweden', defaultTax: 25, taxName: 'Moms' },
  { code: 'NO', name: 'Norway', defaultTax: 25, taxName: 'MVA' },
  { code: 'DK', name: 'Denmark', defaultTax: 25, taxName: 'Moms' },
  { code: 'FI', name: 'Finland', defaultTax: 24, taxName: 'ALV' },
  { code: 'PL', name: 'Poland', defaultTax: 23, taxName: 'PTU' },
  { code: 'CH', name: 'Switzerland', defaultTax: 7.7, taxName: 'MwSt' },
  { code: 'IE', name: 'Ireland', defaultTax: 23, taxName: 'VAT' },
  { code: 'AU', name: 'Australia', defaultTax: 10, taxName: 'GST' },
  { code: 'NZ', name: 'New Zealand', defaultTax: 15, taxName: 'GST' },
  { code: 'JP', name: 'Japan', defaultTax: 10, taxName: 'Consumption Tax' },
  { code: 'KR', name: 'South Korea', defaultTax: 10, taxName: 'VAT' },
  { code: 'SG', name: 'Singapore', defaultTax: 8, taxName: 'GST' },
  { code: 'HK', name: 'Hong Kong', defaultTax: 0, taxName: 'N/A' },
  { code: 'IN', name: 'India', defaultTax: 18, taxName: 'GST' },
  { code: 'AE', name: 'United Arab Emirates', defaultTax: 5, taxName: 'VAT' },
  { code: 'SA', name: 'Saudi Arabia', defaultTax: 15, taxName: 'VAT' },
  { code: 'ZA', name: 'South Africa', defaultTax: 15, taxName: 'VAT' },
  { code: 'BR', name: 'Brazil', defaultTax: 17, taxName: 'ICMS' },
  { code: 'MX', name: 'Mexico', defaultTax: 16, taxName: 'IVA' },
  { code: 'AR', name: 'Argentina', defaultTax: 21, taxName: 'IVA' },
  { code: 'CL', name: 'Chile', defaultTax: 19, taxName: 'IVA' },
  { code: 'CO', name: 'Colombia', defaultTax: 19, taxName: 'IVA' },
  { code: 'MY', name: 'Malaysia', defaultTax: 6, taxName: 'SST' },
  { code: 'TH', name: 'Thailand', defaultTax: 7, taxName: 'VAT' },
  { code: 'ID', name: 'Indonesia', defaultTax: 11, taxName: 'PPN' },
  { code: 'PH', name: 'Philippines', defaultTax: 12, taxName: 'VAT' },
  { code: 'VN', name: 'Vietnam', defaultTax: 10, taxName: 'VAT' },
  { code: 'TW', name: 'Taiwan', defaultTax: 5, taxName: 'VAT' },
  { code: 'CN', name: 'China', defaultTax: 13, taxName: 'VAT' },
  { code: 'TR', name: 'Turkey', defaultTax: 18, taxName: 'KDV' },
  { code: 'IL', name: 'Israel', defaultTax: 17, taxName: 'VAT' }
];

export default function ShippingSettingsPage() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>({ zones: [] });
  const [carriers, setCarriers] = useState<any[]>(STATIC_CARRIERS);
  const [carrierConfigs, setCarrierConfigs] = useState<Record<string, any>>({});
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({ 
    enabled: false, 
    default_rate: 0,
    include_in_price: false,
    country_rates: []
  });
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [, setLocale] = useState('en-US');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [activeZoneCountryPicker, setActiveZoneCountryPicker] = useState<string | null>(null);
  const [zoneCountrySearch, setZoneCountrySearch] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!merchant?.id) {
        setLoading(merchantLoading);
        return;
      }

      setMerchantId(merchant.id);
      setCurrency(merchant.currency || 'USD');
      setLocale(merchant.locale || 'en-US');
      if ((merchant as any).shipping_settings) {
        setShippingSettings((merchant as any).shipping_settings as ShippingSettings);
      }
      if ((merchant as any).tax_settings) {
        const existingTax = (merchant as any).tax_settings as any;
          setTaxSettings({
            enabled: existingTax.enabled || false,
            default_rate: existingTax.default_rate || 0,
            include_in_price: existingTax.include_in_price || false,
            country_rates: existingTax.country_rates || []
          });
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/shipping?merchantId=${merchant.id}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
        });
        const data = await response.json();
        if (data.carriers) setCarriers(data.carriers);
        if (data.configs) setCarrierConfigs(data.configs);
      } catch (err) {
      }

      setLoading(false);
    };

    fetchSettings();
  }, [merchant, merchantLoading]);

  const handleSave = async () => {
    if (!merchantId) return;
    setSaving(true);

    const response = await fetch('/api/merchant/settings/update', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: {
          shipping_settings: shippingSettings,
          tax_settings: taxSettings
        }
      }),
    });

    if (!response.ok) {
      toast.error('Failed to save settings');
    } else {
      refetch();
      toast.success('Shipping and tax settings saved successfully');
    }
    setSaving(false);
  };

  const addZone = () => {
    const newZone: ShippingZone = {
      id: crypto.randomUUID(),
      name: 'Global Access Zone',
      countries: [],
      rates: []
    };
    setShippingSettings(prev => ({
      ...prev,
      zones: [...prev.zones, newZone]
    }));
  };

  const removeZone = (zoneId: string) => {
    setShippingSettings(prev => ({
      ...prev,
      zones: prev.zones.filter(z => z.id !== zoneId)
    }));
  };

  const updateZoneName = (zoneId: string, name: string) => {
    setShippingSettings(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zoneId ? { ...z, name } : z)
    }));
  };

  const addRate = (zoneId: string) => {
    const newRate: ShippingRate = {
      id: crypto.randomUUID(),
      name: 'Standard Stream',
      price: 0
    };
    setShippingSettings(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zoneId ? { ...z, rates: [...z.rates, newRate] } : z)
    }));
  };

  const removeRate = (zoneId: string, rateId: string) => {
    setShippingSettings(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zoneId ? { ...z, rates: z.rates.filter(r => r.id !== rateId) } : z)
    }));
  };

  const updateRate = (zoneId: string, rateId: string, updates: Partial<ShippingRate>) => {
    setShippingSettings(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zoneId ? {
        ...z,
        rates: z.rates.map(r => r.id === rateId ? { ...r, ...updates } : r)
      } : z)
    }));
  };

  const addCountryToZone = (zoneId: string, countryCode: string) => {
    setShippingSettings(prev => ({
      ...prev,
      zones: prev.zones.map(z => {
        if (z.id === zoneId && !z.countries.includes(countryCode)) {
          return { ...z, countries: [...z.countries, countryCode] };
        }
        return z;
      })
    }));
    setActiveZoneCountryPicker(null);
    setZoneCountrySearch('');
  };

  const removeCountryFromZone = (zoneId: string, countryCode: string) => {
    setShippingSettings(prev => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zoneId ? {
        ...z,
        countries: z.countries.filter(c => c !== countryCode)
      } : z)
    }));
  };

  const getCountryName = (code: string) => {
    return COUNTRIES.find(c => c.code === code)?.name || code;
  };

  const getAvailableCountriesForZone = (zoneId: string) => {
    const usedCountries = shippingSettings.zones
      .filter(z => z.id !== zoneId)
      .flatMap(z => z.countries);
    return COUNTRIES.filter(c => 
      !usedCountries.includes(c.code) &&
      (c.name.toLowerCase().includes(zoneCountrySearch.toLowerCase()) ||
       c.code.toLowerCase().includes(zoneCountrySearch.toLowerCase()))
    );
  };

  const addCountryTaxRate = (country: typeof COUNTRIES[0]) => {
    if (taxSettings.country_rates.some(c => c.country_code === country.code)) {
      toast.error(`${country.name} is already added`);
      return;
    }
    setTaxSettings(prev => ({
      ...prev,
      country_rates: [...prev.country_rates, {
        country_code: country.code,
        country_name: country.name,
        rate: country.defaultTax,
        tax_name: country.taxName
      }]
    }));
    setShowCountryPicker(false);
    setCountrySearch('');
  };

  const removeCountryTaxRate = (countryCode: string) => {
    setTaxSettings(prev => ({
      ...prev,
      country_rates: prev.country_rates.filter(c => c.country_code !== countryCode)
    }));
  };

  const updateCountryTaxRate = (countryCode: string, rate: number) => {
    setTaxSettings(prev => ({
      ...prev,
      country_rates: prev.country_rates.map(c => 
        c.country_code === countryCode ? { ...c, rate } : c
      )
    }));
  };

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  if (merchantLoading || loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Logistics</Badge>
            <Link href="/settings/locations" className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary hover:underline">
              Inventory Locations →
            </Link>
          </div>
          <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Fulfillment</h2>
          <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Configure how your products reach customers and how taxes are calculated across borders.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </header>

      <div className="space-y-6">
        {/* Taxes */}
        <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="py-4 px-6 border-b border-border/70 bg-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background border border-border/70 flex items-center justify-center">
                    <Percent className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Tax Rules</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Autonomous tax calculation by jurisdiction.</CardDescription>
                  </div>
              </div>
              <Switch 
                checked={taxSettings.enabled} 
                onCheckedChange={(checked) => setTaxSettings(prev => ({ ...prev, enabled: checked }))}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardHeader>
          {taxSettings.enabled && (
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 bg-secondary/20 rounded-2xl border border-border/70 group hover:border-border transition-all">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5 mb-3 block">Standard Baseline</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="number"
                      value={taxSettings.default_rate}
                      onChange={(e) => setTaxSettings(prev => ({ ...prev, default_rate: parseFloat(e.target.value) || 0 }))}
                      className="h-11 w-24 bg-background border-border/70 text-lg font-bold font-mono focus:ring-1 focus:ring-emerald-500/20 rounded-[12px]"
                    />
                    <span className="text-lg font-bold text-muted-foreground/60">%</span>
                    <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-[0.12em] ml-auto text-right leading-tight">Applied to all<br/>undefined regions</p>
                  </div>
                </div>

                <div className="p-5 bg-secondary/20 rounded-2xl border border-border/70 group hover:border-border transition-all flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-[15px] font-semibold text-foreground">Gross Pricing</Label>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">Display prices inclusive of tax.</p>
                  </div>
                  <Switch 
                    checked={taxSettings.include_in_price} 
                    onCheckedChange={(checked) => setTaxSettings(prev => ({ ...prev, include_in_price: checked }))}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-0.5">
                  <h3 className="text-[11.5px] font-bold text-muted-foreground/65 uppercase tracking-[0.12em]">Jurisdiction Overrides</h3>
                  <div className="relative">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowCountryPicker(!showCountryPicker)} 
                      className="h-9 px-4 text-[11px] font-bold uppercase tracking-[0.12em] border-border/70 bg-background hover:bg-secondary/40 rounded-[12px] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Add jurisdiction
                    </Button>
                    
                    <AnimatePresence>
                      {showCountryPicker && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-3 w-80 bg-popover border border-border/70 rounded-[20px] shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="p-3.5 border-b border-border/70 bg-secondary/30">
                            <div className="relative group">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors" />
                              <Input 
                                placeholder="Search regions..."
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                className="h-9 pl-9 bg-background border-border/70 text-[13px] rounded-[10px]"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                onClick={() => addCountryTaxRate(country)}
                                disabled={taxSettings.country_rates.some(c => c.country_code === country.code)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] hover:bg-secondary/40 disabled:opacity-30 disabled:cursor-not-allowed text-left transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-[14px] font-semibold text-foreground">{country.name}</span>
                                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-border/70 rounded-md">{country.code}</Badge>
                                </div>
                                <span className="text-[11px] text-muted-foreground/70 font-bold">{country.defaultTax}%</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {taxSettings.country_rates.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border/70 rounded-[24px] bg-secondary/10">
                    <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-[13px] font-bold text-muted-foreground/50 uppercase tracking-[0.12em]">Global Default Active</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {taxSettings.country_rates.map((countryRate) => (
                      <div key={countryRate.country_code} className="flex items-center justify-between p-4 bg-secondary/20 border border-border/70 rounded-[20px] group hover:border-border transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-xl bg-background border border-border/70 flex items-center justify-center text-[11px] font-black text-foreground shadow-sm">
                            {countryRate.country_code}
                          </div>
                          <div>
                            <p className="text-[14.5px] font-semibold text-foreground">{countryRate.country_name}</p>
                            <p className="text-[11px] text-muted-foreground/60 font-bold uppercase tracking-[0.12em]">{countryRate.tax_name || 'TAX'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number"
                              value={countryRate.rate}
                              onChange={(e) => updateCountryTaxRate(countryRate.country_code, parseFloat(e.target.value) || 0)}
                              className="h-9 w-16 bg-background border-border/70 text-[13px] font-bold text-right focus:ring-1 focus:ring-emerald-500/20 rounded-[10px]"
                              step="0.1"
                            />
                            <span className="text-[13px] font-bold text-muted-foreground/60">%</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeCountryTaxRate(countryRate.country_code)} 
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Carriers */}
        <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="py-4 px-6 border-b border-border/70 bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                <Truck className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold tracking-tight">Integrated Carriers</CardTitle>
                <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">High-performance shipping API integrations.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {carriers.map((carrier) => {
                  const config = carrierConfigs[carrier.id];
                  const isEnabled = config?.is_enabled;
                  const isConfigured = config?.credentials && Object.keys(config.credentials).length > 0;
                
                return (
                  <div key={carrier.id} className="flex items-center justify-between p-4 bg-secondary/20 border border-border/70 rounded-[20px] group hover:border-border transition-all duration-300 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-border/70 flex items-center justify-center p-2.5 transition-transform group-hover:scale-105 shadow-sm overflow-hidden">
                        {carrier.logo ? (
                          <img src={carrier.logo} alt={carrier.name} className="w-full h-full object-contain" />
                        ) : (
                          <Truck className="w-6 h-6 text-muted-foreground opacity-30" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[15px] font-semibold text-foreground tracking-tight">{carrier.name}</p>
                          {isEnabled ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">Active</Badge>
                          ) : isConfigured ? (
                            <Badge className="bg-yellow-400/10 text-yellow-600 border-yellow-400/20 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">Paused</Badge>
                          ) : null}
                        </div>
                          <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-[0.12em]">
                            {carrier.countries.includes('*') ? 'Global Service' : carrier.countries.join(', ')}
                          </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-9 px-4 text-[11px] font-bold uppercase tracking-[0.12em] border-border/70 bg-background hover:bg-secondary/40 rounded-[12px] transition-all">
                      <Link href={`/settings/shipping/${carrier.id}`}>
                        {isConfigured ? 'Configure' : 'Initialize'} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Zones */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[11.5px] font-bold text-muted-foreground/65 uppercase tracking-[0.12em]">Distribution Zones</h2>
            <Button 
              onClick={addZone} 
              className="h-10 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" /> Create stream zone
            </Button>
          </div>

          {shippingSettings.zones.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/70 rounded-[32px] bg-secondary/10">
              <MapPin className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-[16px] font-semibold text-foreground tracking-tight">No distribution zones</p>
              <p className="text-[13px] text-muted-foreground mt-1 max-w-[240px] mx-auto leading-relaxed">Initialize a zone to define geographic logistics.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {shippingSettings.zones.map((zone) => (
                <Card key={zone.id} className="border-border/70 bg-card rounded-[32px] overflow-hidden shadow-sm group hover:border-border transition-all duration-500">
                  <CardHeader className="py-5 px-8 border-b border-border/70 bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 max-w-xl">
                        <Input 
                          value={zone.name}
                          onChange={(e) => updateZoneName(zone.id, e.target.value)}
                          className="h-10 text-xl font-bold tracking-tight border-none bg-transparent focus-visible:ring-0 p-0 hover:text-foreground transition-colors"
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeZone(zone.id)} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] flex items-center gap-2">
                          <Globe className="w-4 h-4" /> Coverage
                        </h3>
                        <div className="relative">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setActiveZoneCountryPicker(activeZoneCountryPicker === zone.id ? null : zone.id);
                              setZoneCountrySearch('');
                            }} 
                            className="h-8 px-4 text-[10px] font-bold uppercase tracking-[0.12em] border-border/70 hover:bg-secondary/40 rounded-[10px] transition-all shadow-sm"
                          >
                            <Plus className="w-3 h-3 mr-1.5" /> Select regions
                          </Button>
                          
                          <AnimatePresence>
                            {activeZoneCountryPicker === zone.id && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-3 w-80 bg-popover border border-border/70 rounded-[20px] shadow-2xl z-50 overflow-hidden"
                              >
                                <div className="p-3.5 border-b border-border/70 bg-secondary/30">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                                    <Input 
                                      placeholder="Filter regions..."
                                      value={zoneCountrySearch}
                                      onChange={(e) => setZoneCountrySearch(e.target.value)}
                                      className="h-9 pl-9 bg-background border-border/70 text-[13px] rounded-[10px]"
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
                                  {getAvailableCountriesForZone(zone.id).length === 0 ? (
                                    <div className="p-8 text-center text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.12em]">
                                      All regions allocated
                                    </div>
                                  ) : (
                                    getAvailableCountriesForZone(zone.id).map((country) => (
                                      <button
                                        key={country.code}
                                        onClick={() => addCountryToZone(zone.id, country.code)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-secondary/40 transition-colors text-left"
                                      >
                                        <span className="text-[14px] font-semibold text-foreground">{country.name}</span>
                                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-border/70 ml-auto rounded-md">{country.code}</Badge>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
  
                      {zone.countries.length === 0 ? (
                        <div className="py-8 bg-secondary/10 border border-dashed border-border/70 rounded-[20px] text-center">
                          <p className="text-[13px] font-medium text-muted-foreground/60">Zone currently offline (No regions assigned)</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {zone.countries.map((countryCode) => (
                            <Badge 
                              key={countryCode} 
                              variant="secondary" 
                              className="bg-secondary/30 text-foreground hover:bg-secondary/40 px-3 py-1.5 text-[12px] font-semibold border-border/70 flex items-center gap-2 rounded-[12px] transition-all shadow-sm"
                            >
                              {getCountryName(countryCode)}
                              <button 
                                onClick={() => removeCountryFromZone(zone.id, countryCode)}
                                className="ml-1 text-muted-foreground/60 hover:text-red-500 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
  
                    <div className="space-y-5">
                      <div className="flex items-center justify-between px-0.5">
                        <h3 className="text-[13px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] flex items-center gap-2">
                          <Coins className="w-4 h-4" /> Pricing Tiers
                        </h3>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addRate(zone.id)} 
                          className="h-8 px-4 text-[10px] font-bold uppercase tracking-[0.12em] border-border/70 hover:bg-secondary/40 rounded-[10px] transition-all shadow-sm"
                        >
                          <Plus className="w-3 h-3 mr-1.5" /> Add tier
                        </Button>
                      </div>
  
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {zone.rates.length === 0 ? (
                            <div className="md:col-span-2 py-8 bg-secondary/10 border border-dashed border-border/70 rounded-[20px] text-center">
                              <p className="text-[13px] font-medium text-muted-foreground/60 italic">Zero pricing rules established</p>
                            </div>
                          ) : (
                            zone.rates.map((rate) => (
                              <div key={rate.id} className="flex items-center gap-4 p-5 bg-secondary/20 border border-border/70 rounded-[24px] group/rate hover:border-border transition-all duration-300 shadow-sm relative">
                                <div className="flex-1 space-y-4">
                                  <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em] px-0.5">Rate Name</Label>
                                    <Input 
                                      value={rate.name}
                                      onChange={(e) => updateRate(zone.id, rate.id, { name: e.target.value })}
                                      className="h-10 bg-background border-border/70 text-[14px] font-semibold focus:ring-1 focus:ring-emerald-500/20 rounded-[10px]"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em] px-0.5">Price ({currency})</Label>
                                    <div className="relative">
                                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-bold font-mono text-[15px]">$</span>
                                      <Input 
                                        type="number"
                                        value={rate.price}
                                        onChange={(e) => updateRate(zone.id, rate.id, { price: parseFloat(e.target.value) || 0 })}
                                        className="h-10 bg-background border-border/70 pl-8 text-[16px] font-bold font-mono focus:ring-1 focus:ring-emerald-500/20 rounded-[10px]"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeRate(zone.id, rate.id)} 
                                  className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/5 opacity-0 group-hover/rate:opacity-100 transition-all absolute top-3 right-3"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {(showCountryPicker || activeZoneCountryPicker) && (
        <div 
          className="fixed inset-0 z-40 bg-background/20 backdrop-blur-[2px]" 
          onClick={() => {
            setShowCountryPicker(false);
            setActiveZoneCountryPicker(null);
          }}
        />
      )}
    </div>
  );
}
