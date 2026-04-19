"use client"

import React, { useEffect, useState } from 'react';
import { 
  Banknote,
  Eye,
  EyeOff,
    Check,
    AlertCircle,
    Loader2
  } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';

interface PaymentMethods {
  cod: { enabled: boolean };
  stripe: { 
    enabled: boolean; 
    test_mode: boolean;
    secret_key: string | null; 
    publishable_key: string | null;
    test_secret_key: string | null;
    test_publishable_key: string | null;
    webhook_secret: string | null;
    test_webhook_secret: string | null;
  };
  razorpay: { 
    enabled: boolean; 
    test_mode: boolean;
    key_id: string | null; 
    key_secret: string | null;
    test_key_id: string | null;
    test_key_secret: string | null;
  };
  paypal: { 
    enabled: boolean; 
    test_mode: boolean;
    client_id: string | null; 
    client_secret: string | null;
    test_client_id: string | null;
    test_client_secret: string | null;
  };
}

const defaultPaymentMethods: PaymentMethods = {
  cod: { enabled: true },
  stripe: { 
    enabled: false, 
    test_mode: true,
    secret_key: null, 
    publishable_key: null,
    test_secret_key: null,
    test_publishable_key: null,
    webhook_secret: null,
    test_webhook_secret: null
  },
  razorpay: { 
    enabled: false, 
    test_mode: true,
    key_id: null, 
    key_secret: null,
    test_key_id: null,
    test_key_secret: null
  },
  paypal: { 
    enabled: false, 
    test_mode: true,
    client_id: null, 
    client_secret: null,
    test_client_id: null,
    test_client_secret: null
  }
};

export default function PaymentSettingsPage() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>(defaultPaymentMethods);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (merchant?.payment_methods) {
      setPaymentMethods({ ...defaultPaymentMethods, ...merchant.payment_methods as Partial<PaymentMethods> });
    } else if (merchant) {
      setPaymentMethods(defaultPaymentMethods);
    }
  }, [merchant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/merchant/settings/payments', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_methods: paymentMethods }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save payment settings');
      }

      await refetch();
      toast.success('Payment settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payment settings');
    }
    setSaving(false);
  };

  const toggleGateway = (gateway: keyof PaymentMethods, enabled: boolean) => {
    setPaymentMethods(prev => ({
      ...prev,
      [gateway]: { ...prev[gateway], enabled }
    }));
  };

  const updateGatewayField = (gateway: keyof PaymentMethods, field: string, value: string) => {
    setPaymentMethods(prev => ({
      ...prev,
      [gateway]: { ...prev[gateway], [field]: value || null }
    }));
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (merchantLoading) {
    return <MerchantPageSkeleton />;
  }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Operations</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Payment Methods</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Payments</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Accept payments via Stripe, Razorpay, or COD from a calm control surface.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
          >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Save Changes
          </Button>
        </div>
  
        <div className="space-y-6">
        {/* Cash on Delivery */}
        <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Banknote className="w-4 h-4 text-foreground" />
                </div>
                <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Cash on Delivery</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Customers pay in cash when their order is delivered.</CardDescription>
                </div>
              </div>
              <Switch 
                checked={paymentMethods.cod.enabled} 
                onCheckedChange={(checked) => toggleGateway('cod', checked)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardHeader>
          {paymentMethods.cod.enabled && (
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-[11px] font-bold text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 px-4 py-3 rounded-[16px] uppercase tracking-[0.12em] shadow-sm">
                <Check className="w-4 h-4" />
                  <span>Enabled. No extra setup needed.</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Stripe */}
        <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#635bff">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-[17px] font-semibold tracking-tight">Stripe</CardTitle>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold uppercase px-2 py-0.5 rounded-full tracking-[0.12em]">Recommended</Badge>
                    </div>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Accept credit cards, Apple Pay, and Google Pay.</CardDescription>
                </div>
              </div>
              <Switch 
                checked={paymentMethods.stripe.enabled} 
                onCheckedChange={(checked) => toggleGateway('stripe', checked)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardHeader>
            {paymentMethods.stripe.enabled && (
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70 transition-all shadow-sm">
                  <div className="space-y-0.5">
                      <p className="text-[15px] font-semibold text-foreground">Test Mode</p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">Use test keys to try payments without real charges.</p>
                  </div>
                  <Switch 
                    checked={paymentMethods.stripe.test_mode} 
                    onCheckedChange={(checked) => setPaymentMethods(prev => ({
                      ...prev,
                      stripe: { ...prev.stripe, test_mode: checked }
                    }))}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <h3 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Live Keys</h3>
                      <div className="space-y-2">
                        <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Publishable Key</Label>
                      <Input 
                        placeholder="pk_live_..." 
                        value={paymentMethods.stripe.publishable_key || ''}
                        onChange={(e) => updateGatewayField('stripe', 'publishable_key', e.target.value)}
                        className="h-11 bg-secondary/20 border-border/70 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                        disabled={paymentMethods.stripe.test_mode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Secret Key</Label>
                      <div className="relative group">
                        <Input 
                          type={showSecrets['stripe_secret'] ? 'text' : 'password'}
                          placeholder="sk_live_..." 
                          value={paymentMethods.stripe.secret_key || ''}
                          onChange={(e) => updateGatewayField('stripe', 'secret_key', e.target.value)}
                          className="h-11 bg-secondary/20 border-border/70 pr-12 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                          disabled={paymentMethods.stripe.test_mode}
                        />
                        <button 
                          type="button"
                          onClick={() => toggleShowSecret('stripe_secret')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          {showSecrets['stripe_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                    <div className="space-y-5">
                      <h3 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Test Keys</h3>
                      <div className="space-y-2">
                        <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Test Publishable Key</Label>
                      <Input 
                        placeholder="pk_test_..." 
                        value={paymentMethods.stripe.test_publishable_key || ''}
                        onChange={(e) => updateGatewayField('stripe', 'test_publishable_key', e.target.value)}
                        className="h-11 bg-secondary/20 border-border/70 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                        disabled={!paymentMethods.stripe.test_mode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Test Secret Key</Label>
                      <div className="relative group">
                        <Input 
                          type={showSecrets['stripe_test_secret'] ? 'text' : 'password'}
                          placeholder="sk_test_..." 
                          value={paymentMethods.stripe.test_secret_key || ''}
                          onChange={(e) => updateGatewayField('stripe', 'test_secret_key', e.target.value)}
                          className="h-11 bg-secondary/20 border-border/70 pr-12 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                          disabled={!paymentMethods.stripe.test_mode}
                        />
                        <button 
                          type="button"
                          onClick={() => toggleShowSecret('stripe_test_secret')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          {showSecrets['stripe_test_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/60" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Live Webhook Secret</Label>
                    <div className="relative group">
                      <Input 
                        type={showSecrets['stripe_webhook'] ? 'text' : 'password'}
                        placeholder="whsec_..." 
                        value={paymentMethods.stripe.webhook_secret || ''}
                        onChange={(e) => updateGatewayField('stripe', 'webhook_secret', e.target.value)}
                        className="h-11 bg-secondary/20 border-border/70 pr-12 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                        disabled={paymentMethods.stripe.test_mode}
                      />
                      <button 
                        type="button"
                        onClick={() => toggleShowSecret('stripe_webhook')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                      >
                        {showSecrets['stripe_webhook'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Test Webhook Secret</Label>
                    <div className="relative group">
                      <Input 
                        type={showSecrets['stripe_test_webhook'] ? 'text' : 'password'}
                        placeholder="whsec_..." 
                        value={(paymentMethods.stripe as any).test_webhook_secret || ''}
                        onChange={(e) => updateGatewayField('stripe', 'test_webhook_secret', e.target.value)}
                        className="h-11 bg-secondary/20 border-border/70 pr-12 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                        disabled={!paymentMethods.stripe.test_mode}
                      />
                      <button 
                        type="button"
                        onClick={() => toggleShowSecret('stripe_test_webhook')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                      >
                        {showSecrets['stripe_test_webhook'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground/60 font-bold uppercase tracking-[0.12em] italic px-0.5">Needed to receive payment notifications from Stripe.</p>

                <div className="flex items-start gap-4 p-5 bg-emerald-500/5 rounded-[20px] border border-emerald-500/10 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
                    <AlertCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Where to find your keys</p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground/85 font-medium">Get your API keys from the <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold">Stripe Dashboard</a></p>
                  </div>
                </div>
              </CardContent>
            )}
        </Card>

        {/* Razorpay */}
        <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#3395ff">
                    <path d="M12 0L0 4.5v15L12 24l12-4.5v-15L12 0zm0 2.25l9 3.375v11.25l-9 3.375-9-3.375V5.625l9-3.375z"/>
                  </svg>
                </div>
                <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Razorpay</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Accept UPI, cards, and wallets — best for Indian customers.</CardDescription>
                </div>
              </div>
              <Switch 
                checked={paymentMethods.razorpay.enabled} 
                onCheckedChange={(checked) => toggleGateway('razorpay', checked)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardHeader>
            {paymentMethods.razorpay.enabled && (
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70 transition-all shadow-sm">
                  <div className="space-y-0.5">
                      <p className="text-[15px] font-semibold text-foreground">Test Mode</p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">Use test credentials to try payments without real charges.</p>
                  </div>
                  <Switch 
                    checked={paymentMethods.razorpay.test_mode} 
                    onCheckedChange={(checked) => setPaymentMethods(prev => ({
                      ...prev,
                      razorpay: { ...prev.razorpay, test_mode: checked }
                    }))}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                      <h3 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Live Keys</h3>
                      <div className="space-y-2">
                        <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Key ID</Label>
                      <Input 
                        placeholder="rzp_live_..." 
                        value={paymentMethods.razorpay.key_id || ''}
                        onChange={(e) => updateGatewayField('razorpay', 'key_id', e.target.value)}
                        className="h-11 bg-secondary/20 border-border/70 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                        disabled={paymentMethods.razorpay.test_mode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Key Secret</Label>
                      <div className="relative group">
                        <Input 
                          type={showSecrets['razorpay_secret'] ? 'text' : 'password'}
                          placeholder="••••••••••••" 
                          value={paymentMethods.razorpay.key_secret || ''}
                          onChange={(e) => updateGatewayField('razorpay', 'key_secret', e.target.value)}
                          className="h-11 bg-secondary/20 border-border/70 pr-12 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                          disabled={paymentMethods.razorpay.test_mode}
                        />
                        <button 
                          type="button"
                          onClick={() => toggleShowSecret('razorpay_secret')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          {showSecrets['razorpay_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                    <div className="space-y-5">
                      <h3 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Test Keys</h3>
                      <div className="space-y-2">
                        <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Test Key ID</Label>
                      <Input 
                        placeholder="rzp_test_..." 
                        value={paymentMethods.razorpay.test_key_id || ''}
                        onChange={(e) => updateGatewayField('razorpay', 'test_key_id', e.target.value)}
                        className="h-11 bg-secondary/20 border-border/70 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                        disabled={!paymentMethods.razorpay.test_mode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Test Key Secret</Label>
                      <div className="relative group">
                        <Input 
                          type={showSecrets['razorpay_test_secret'] ? 'text' : 'password'}
                          placeholder="••••••••••••" 
                          value={paymentMethods.razorpay.test_key_secret || ''}
                          onChange={(e) => updateGatewayField('razorpay', 'test_key_secret', e.target.value)}
                          className="h-11 bg-secondary/20 border-border/70 pr-12 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                          disabled={!paymentMethods.razorpay.test_mode}
                        />
                        <button 
                          type="button"
                          onClick={() => toggleShowSecret('razorpay_test_secret')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          {showSecrets['razorpay_test_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-emerald-500/5 rounded-[20px] border border-emerald-500/10 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
                    <AlertCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Where to find your keys</p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground/85 font-medium">Get your API keys from the <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold">Razorpay Dashboard</a></p>
                  </div>
                </div>
              </CardContent>
            )}
        </Card>

        {/* PayPal */}
        <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#003087">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.99c-.536 0-.988.385-1.072.914l-.851 5.092z"/>
                  </svg>
                </div>
                <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">PayPal</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Accept PayPal payments and linked credit cards worldwide.</CardDescription>
                </div>
              </div>
              <Switch 
                checked={paymentMethods.paypal.enabled} 
                onCheckedChange={(checked) => toggleGateway('paypal', checked)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardHeader>
            {paymentMethods.paypal.enabled && (
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70 transition-all shadow-sm">
                  <div className="space-y-0.5">
                      <p className="text-[15px] font-semibold text-foreground">Sandbox Mode</p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">Use sandbox credentials to test checkout without real charges.</p>
                  </div>
                  <Switch 
                    checked={paymentMethods.paypal.test_mode} 
                    onCheckedChange={(checked) => setPaymentMethods(prev => ({
                      ...prev,
                      paypal: { ...prev.paypal, test_mode: checked }
                    }))}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                      <h3 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Live Credentials</h3>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Client ID</Label>
                      <Input 
                        placeholder="Your live client ID" 
                        value={paymentMethods.paypal.client_id || ''}
                        onChange={(e) => updateGatewayField('paypal', 'client_id', e.target.value)}
                        className="h-11 bg-secondary/20 border-border/70 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                        disabled={paymentMethods.paypal.test_mode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Client Secret</Label>
                      <div className="relative group">
                        <Input 
                          type={showSecrets['paypal_secret'] ? 'text' : 'password'}
                          placeholder="••••••••••••" 
                          value={paymentMethods.paypal.client_secret || ''}
                          onChange={(e) => updateGatewayField('paypal', 'client_secret', e.target.value)}
                          className="h-11 bg-secondary/20 border-border/70 pr-12 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                          disabled={paymentMethods.paypal.test_mode}
                        />
                        <button 
                          type="button"
                          onClick={() => toggleShowSecret('paypal_secret')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          {showSecrets['paypal_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                      <h3 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Sandbox Credentials</h3>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Sandbox Client ID</Label>
                      <Input 
                        placeholder="Your sandbox client ID" 
                        value={paymentMethods.paypal.test_client_id || ''}
                        onChange={(e) => updateGatewayField('paypal', 'test_client_id', e.target.value)}
                        className="h-11 bg-secondary/20 border-border/70 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                        disabled={!paymentMethods.paypal.test_mode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Sandbox Client Secret</Label>
                      <div className="relative group">
                        <Input 
                          type={showSecrets['paypal_test_secret'] ? 'text' : 'password'}
                          placeholder="••••••••••••" 
                          value={paymentMethods.paypal.test_client_secret || ''}
                          onChange={(e) => updateGatewayField('paypal', 'test_client_secret', e.target.value)}
                          className="h-11 bg-secondary/20 border-border/70 pr-12 font-mono text-[13px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                          disabled={!paymentMethods.paypal.test_mode}
                        />
                        <button 
                          type="button"
                          onClick={() => toggleShowSecret('paypal_test_secret')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          {showSecrets['paypal_test_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-emerald-500/5 rounded-[20px] border border-emerald-500/10 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
                    <AlertCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Where to find your credentials</p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground/85 font-medium">Get your app credentials from the <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold">PayPal Developer Portal</a></p>
                  </div>
                </div>
              </CardContent>
            )}
        </Card>
      </div>
    </div>
  );
}
