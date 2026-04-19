"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, 
  Check, 
  Loader2, 
  ExternalLink, 
  Shield, 
  AlertCircle,
  Eye,
  EyeOff,
  Truck,
  Package,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';

interface CarrierCredential {
  key: string;
  label: string;
  type: 'text' | 'password';
  helpText?: string;
  helpUrl?: string;
}

interface ShippingCarrier {
  id: string;
  name: string;
  logo?: string;
  countries: string[];
  requiredCredentials: CarrierCredential[];
}

// Static carrier definitions — no API call needed to know carrier metadata
const CARRIER_DEFINITIONS: Record<string, ShippingCarrier> = {
  usps: {
    id: 'usps',
    name: 'USPS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/United_States_Postal_Service_Logo.svg/1200px-United_States_Postal_Service_Logo.svg.png',
    countries: ['US'],
    requiredCredentials: [
      { key: 'clientId', label: 'Client ID', type: 'text', helpText: 'Your USPS API Client ID', helpUrl: 'https://developers.usps.com' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', helpText: 'Your USPS API Client Secret', helpUrl: 'https://developers.usps.com' },
    ],
  },
  'royal-mail': {
    id: 'royal-mail',
    name: 'Royal Mail',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Royal_Mail_logo.svg/1200px-Royal_Mail_logo.svg.png',
    countries: ['GB'],
    requiredCredentials: [
      { key: 'apiKey', label: 'API Key', type: 'password', helpText: 'Your Royal Mail Click & Drop API key', helpUrl: 'https://www.royalmail.com/business/shipping/click-drop' },
    ],
  },
  delhivery: {
    id: 'delhivery',
    name: 'Delhivery',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0d/Delhivery_company_logo.png/200px-Delhivery_company_logo.png',
    countries: ['IN'],
    requiredCredentials: [
      { key: 'token', label: 'API Token', type: 'password', helpText: 'Your Delhivery Live API Token', helpUrl: 'https://one.delhivery.com' },
    ],
  },
  'australia-post': {
    id: 'australia-post',
    name: 'Australia Post',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Australia_Post_logo_%282021%29.svg/1200px-Australia_Post_logo_%282021%29.svg.png',
    countries: ['AU'],
    requiredCredentials: [
      { key: 'apiKey', label: 'API Key', type: 'password', helpText: 'Your Australia Post API key', helpUrl: 'https://developers.auspost.com.au' },
      { key: 'accountNumber', label: 'Account Number', type: 'text', helpText: 'Your Australia Post account number' },
      { key: 'password', label: 'Password', type: 'password', helpText: 'Your Australia Post account password' },
    ],
  },
  'dhl-express': {
    id: 'dhl-express',
    name: 'DHL Express',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/DHL_Logo.svg/1200px-DHL_Logo.svg.png',
    countries: ['*'],
    requiredCredentials: [
      { key: 'apiKey', label: 'API Key', type: 'password', helpText: 'Your DHL Express MyDHL API key', helpUrl: 'https://developer.dhl.com' },
      { key: 'apiSecret', label: 'API Secret', type: 'password', helpText: 'Your DHL Express MyDHL API secret' },
      { key: 'accountNumber', label: 'Account Number', type: 'text', helpText: 'Your DHL Express shipper account number' },
    ],
  },
};

export default function ShippingCarrierConfigPage() {
  const params = useParams();
  const router = useRouter();
  const carrierId = params.carrierId as string;
  const { merchant, loading: merchantLoading } = useMerchant();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [carrier, setCarrier] = useState<ShippingCarrier | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [credentialsValid, setCredentialsValid] = useState<boolean | null>(null);
  const [fromAddress, setFromAddress] = useState({
    name: '',
    street1: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  });

    useEffect(() => {
      // Resolve carrier from static definitions immediately — no API needed
      const carrierDef = CARRIER_DEFINITIONS[carrierId];
      if (!carrierDef) {
        setLoading(false);
        return;
      }
      setCarrier(carrierDef);

      const fetchData = async () => {
        try {
          if (!merchant?.id) {
            if (!merchantLoading) {
              router.push('/setup');
            }
            return;
          }

          setMerchantId(merchant.id);

          if (!merchant.business_address) {
            router.push('/setup');
            return;
          }

          const addr = merchant.business_address as unknown as Record<string, string>;
          setFromAddress({
            name: addr.name || '',
            street1: addr.street1 || addr.address || '',
            city: addr.city || '',
            state: addr.state || '',
            postalCode: addr.postalCode || addr.postal_code || addr.zip || '',
            country: addr.country || '',
            phone: addr.phone || '',
          });

          // Fetch saved config for this carrier
          const { data: { session } } = await supabase.auth.getSession();
          const authHeader: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
          const response = await fetch(`/api/shipping?merchantId=${merchant.id}`, { headers: authHeader });
          if (response.ok) {
            const data = await response.json();
            const existingConfig = data.configs?.[carrierId] as Record<string, unknown> | undefined;
            if (existingConfig) {
              setCredentials((existingConfig.credentials as Record<string, string>) || {});
              setIsEnabled((existingConfig.is_enabled as boolean) || false);
              setIsTestMode((existingConfig.is_test_mode as boolean) ?? true);
              if (existingConfig.settings && (existingConfig.settings as any).fromAddress) {
                setFromAddress((existingConfig.settings as any).fromAddress);
              }
            }
          }
        } catch (error) {
          toast.error('Failed to load carrier configuration');
        } finally {
          setLoading(false);
        }
      };

    fetchData();
  }, [carrierId, merchant, merchantLoading, router]);

  const handleSave = async () => {
    if (!merchantId || !carrier) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'saveConfig',
          merchantId,
          carrierId,
          credentials,
          isEnabled,
          isTestMode,
          settings: { fromAddress },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCredentialsValid(result.credentialsValid);
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestRates = async () => {
    if (!merchantId || !carrier) return;
    setTesting(true);

    try {
      const testFrom = {
        name: fromAddress.name || 'Test Sender',
        street1: fromAddress.street1 || '123 Test St',
        city: fromAddress.city || 'New York',
        state: fromAddress.state || 'NY',
        postalCode: fromAddress.postalCode || '10001',
        country: fromAddress.country || 'US',
      };

      const testTo = {
        name: 'Test Recipient',
        street1: '456 Delivery Ave',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
      };

      const { data: { session: testSession } } = await supabase.auth.getSession();
      const response = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(testSession?.access_token ? { Authorization: `Bearer ${testSession.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'getRates',
          merchantId,
          from: testFrom,
          to: testTo,
          packages: [{ weight: 1, weightUnit: 'lb', length: 10, width: 8, height: 4, dimensionUnit: 'in' }],
        }),
      });

      const result = await response.json();

      if (result.rates && result.rates.length > 0) {
        const carrierRates = result.rates.filter((r: { carrierId: string }) => r.carrierId === carrierId);
        if (carrierRates.length > 0) {
          toast.success(`Found ${carrierRates.length} shipping rate(s)! Cheapest: ${carrierRates[0].serviceName} - ${carrierRates[0].currency} ${carrierRates[0].price.toFixed(2)}`);
        } else {
          toast.warning('No rates returned for this carrier. Check your credentials.');
        }
      } else {
        toast.error(result.error || 'No rates returned. Check your credentials.');
      }
    } catch (error) {
      toast.error('Failed to test rates');
    } finally {
      setTesting(false);
    }
  };

  if (merchantLoading || loading) {
    return <MerchantPageSkeleton />;
  }

  if (!carrier) {
    return (
      <div className="max-w-[800px] mx-auto py-8 px-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Carrier not found</h2>
        <p className="text-gray-500 mt-2">The shipping carrier you're looking for doesn't exist.</p>
        <Button asChild className="mt-4">
          <Link href="/settings/shipping">Back to Shipping Settings</Link>
        </Button>
      </div>
    );
  }

  const getCountryFlag = (countryCode: string) => {
    const flags: Record<string, string> = {
      'US': '🇺🇸', 'GB': '🇬🇧', 'UK': '🇬🇧', 'AU': '🇦🇺', 'IN': '🇮🇳', 
      'DE': '🇩🇪', 'FR': '🇫🇷', 'CA': '🇨🇦', 'JP': '🇯🇵', 'CN': '🇨🇳',
      '*': '🌍'
    };
    return flags[countryCode] || '🌍';
  };

  return (
    <div className="max-w-[800px] mx-auto py-8 px-8 font-sans">
      <div className="mb-8">
        <Button variant="ghost" asChild className="p-0 hover:bg-transparent text-muted-foreground hover:text-foreground h-auto text-xs font-medium">
          <Link href="/settings/shipping">
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back to Shipping Settings
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between mb-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-3 shadow-sm">
            {carrier.logo ? (
              <img src={carrier.logo} alt={carrier.name} className="w-full h-full object-contain" />
            ) : (
              <Truck className="w-8 h-8 text-muted-foreground opacity-30" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{carrier.name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              {carrier.countries.slice(0, 3).map((country) => (
                <span key={country} className="text-base" title={country}>
                  {getCountryFlag(country)}
                </span>
              ))}
              {carrier.countries.length > 3 && (
                <span className="text-[10px] text-muted-foreground font-bold">+{carrier.countries.length - 3} more</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {credentialsValid !== null && (
            <Badge variant={credentialsValid ? 'default' : 'secondary'} className={credentialsValid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase px-2.5 py-1 rounded-full' : 'bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-black uppercase px-2.5 py-1 rounded-full'}>
              {credentialsValid ? (
                <><Check className="w-3 h-3 mr-1" /> Verified</>
              ) : (
                <><AlertCircle className="w-3 h-3 mr-1" /> Not Verified</>
              )}
            </Badge>
          )}
          <Button onClick={handleSave} disabled={saving} className="h-11 bg-purple-500 hover:bg-purple-500/90 text-white rounded-lg px-8 font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="py-6 px-8 border-b border-white/5 bg-secondary/25">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-border flex items-center justify-center">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">API Credentials</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-medium mt-0.5">Enter your {carrier.name} API credentials</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Test Mode</span>
                <Switch checked={isTestMode} onCheckedChange={setIsTestMode} className="data-[state=checked]:bg-yellow-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {carrier.requiredCredentials.map((cred) => (
              <div key={cred.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">{cred.label}</label>
                  {cred.helpUrl && (
                    <a
                      href={cred.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold uppercase tracking-widest transition-colors"
                    >
                      Get credentials <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={cred.type === 'password' && !showPasswords[cred.key] ? 'password' : 'text'}
                    value={credentials[cred.key] || ''}
                    onChange={(e) => setCredentials(prev => ({ ...prev, [cred.key]: e.target.value }))}
                    placeholder={cred.helpText || `Enter your ${cred.label}`}
                    className="h-12 bg-background border-border pr-10 focus:ring-1 focus:ring-purple-500 text-sm font-medium"
                  />
                  {cred.type === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, [cred.key]: !prev[cred.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPasswords[cred.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {cred.helpText && (
                  <p className="text-[10px] text-muted-foreground font-medium">{cred.helpText}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="py-6 px-8 border-b border-white/5 bg-secondary/25">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-border flex items-center justify-center">
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Ship From Address</CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-medium mt-0.5">Your warehouse or fulfillment address</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Business Name</label>
                <Input
                  value={fromAddress.name}
                  onChange={(e) => setFromAddress(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your business name"
                  className="h-11 bg-background border-border focus:ring-1 focus:ring-purple-500 text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  value={fromAddress.phone}
                  onChange={(e) => setFromAddress(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 555-123-4567"
                  className="h-11 bg-background border-border focus:ring-1 focus:ring-purple-500 text-sm font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Street Address</label>
              <Input
                value={fromAddress.street1}
                onChange={(e) => setFromAddress(prev => ({ ...prev, street1: e.target.value }))}
                placeholder="123 Main Street"
                className="h-11 bg-background border-border focus:ring-1 focus:ring-purple-500 text-sm font-medium"
              />
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Input
                  value={fromAddress.city}
                  onChange={(e) => setFromAddress(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="h-11 bg-background border-border focus:ring-1 focus:ring-purple-500 text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">State / Province</label>
                <Input
                  value={fromAddress.state}
                  onChange={(e) => setFromAddress(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                  className="h-11 bg-background border-border focus:ring-1 focus:ring-purple-500 text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Postal Code</label>
                <Input
                  value={fromAddress.postalCode}
                  onChange={(e) => setFromAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                  placeholder="12345"
                  className="h-11 bg-background border-border focus:ring-1 focus:ring-purple-500 text-sm font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Country Code</label>
              <Input
                value={fromAddress.country}
                onChange={(e) => setFromAddress(prev => ({ ...prev, country: e.target.value.toUpperCase() }))}
                placeholder="US"
                maxLength={2}
                className="h-11 w-24 bg-background border-border focus:ring-1 focus:ring-purple-500 text-sm font-bold uppercase"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="py-6 px-8 border-b border-white/5 bg-secondary/25">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/20 border border-border flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Enable Carrier</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-medium mt-0.5">
                    When enabled, this carrier will be available at checkout
                  </CardDescription>
                </div>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} className="data-[state=checked]:bg-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <Button
              variant="outline"
              onClick={handleTestRates}
              disabled={testing || !Object.keys(credentials).length}
              className="h-11 px-8 text-[11px] font-bold uppercase tracking-widest border-border hover:bg-accent hover:text-accent-foreground rounded-lg transition-all"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Truck className="w-4 h-4 mr-2" />}
              Test Shipping Rates
            </Button>
            <p className="text-[10px] text-muted-foreground font-medium mt-3">Fetches live rates using sample addresses to verify your credentials.</p>
          </CardContent>
        </Card>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-200">
              <p className="font-bold mb-2 text-[11px] uppercase tracking-widest">How to get your API credentials</p>
              <ol className="list-decimal list-inside space-y-1.5 text-purple-300 text-xs font-medium">
                {carrierId === 'usps' && (
                  <>
                    <li>Go to <a href="https://developers.usps.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-100">developers.usps.com</a></li>
                    <li>Create a developer account and register an app</li>
                    <li>Copy your Client ID and Client Secret</li>
                    <li>Apply for Production access when ready to go live</li>
                  </>
                )}
                {carrierId === 'royal-mail' && (
                  <>
                    <li>Sign up for Royal Mail Click &amp; Drop at <a href="https://www.royalmail.com/business/shipping/click-drop" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-100">royalmail.com</a></li>
                    <li>Link your Online Business Account (OBA)</li>
                    <li>Go to Settings → Integrations in Click &amp; Drop</li>
                    <li>Add a new API integration to get your API key</li>
                  </>
                )}
                {carrierId === 'delhivery' && (
                  <>
                    <li>Register at <a href="https://one.delhivery.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-100">one.delhivery.com</a></li>
                    <li>Complete business verification</li>
                    <li>Go to Developer Portal → Documents</li>
                    <li>Generate your Live API Token</li>
                  </>
                )}
                {carrierId === 'australia-post' && (
                  <>
                    <li>Go to <a href="https://developers.auspost.com.au" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-100">developers.auspost.com.au</a></li>
                    <li>Register and get an API key</li>
                    <li>Apply for Shipping API access</li>
                    <li>Set up your account credentials in the developer portal</li>
                  </>
                )}
                {carrierId === 'dhl-express' && (
                  <>
                    <li>Visit <a href="https://developer.dhl.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-100">developer.dhl.com</a></li>
                    <li>Create a developer account</li>
                    <li>Register an app and get your MyDHL API credentials</li>
                    <li>Link your DHL Express shipper account number</li>
                  </>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
