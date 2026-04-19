"use client"

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ImageUpload } from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { 
  ChevronLeft, 
  Shield, 
  Mail, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  Save, 
  Loader2, 
  Info 
} from 'lucide-react';
import { useMerchant } from '@/hooks/use-merchant';

interface AuthSettings {
  email_verification_required: boolean;
  google_login_enabled: boolean;
  google_client_id: string | null;
}

export default function LoginSettingsPage() {
  const { merchant, loading, refetch } = useMerchant();
  const [saving, setSaving] = useState(false);
  const [subdomain, setSubdomain] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [authSettings, setAuthSettings] = useState<AuthSettings>({
    email_verification_required: true,
    google_login_enabled: false,
    google_client_id: null
  });

  useEffect(() => {
    if (!merchant) return;
    setSubdomain(merchant.subdomain || '');
    setLogoUrl(merchant.branding_settings?.logo_url || null);
    if ((merchant as any).auth_settings) {
      setAuthSettings(prev => ({
        ...prev,
        ...((merchant as any).auth_settings || {})
      }));
    }
  }, [merchant]);

  const handleSave = async () => {
    setSaving(true);
    const response = await fetch('/api/merchant/settings/update', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { auth_settings: authSettings } }),
    });

    if (!response.ok) {
      toast.error('Failed to save login settings');
    } else {
      toast.success('Login settings saved successfully');
    }
    setSaving(false);
  };

  const handleLogoChange = async (url: string) => {
    setLogoUrl(url);

    const response = await fetch('/api/merchant/settings/update', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: { branding_settings: { logo_url: url } },
        mergeKeys: ['branding_settings'],
      }),
    });

    if (!response.ok) {
      toast.error('Failed to update logo');
    } else {
      refetch();
      toast.success('Logo updated successfully');
    }
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Identity</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Buyer Authentication</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Customer Login</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Configure authentication options for your store customers from a calm control surface.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
  
        <div className="space-y-6">
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Shield className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Branding</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">This logo appears on your store&apos;s login and signup pages.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Logo Image</Label>
                  <ImageUpload 
                    value={logoUrl || ''} 
                    onChange={handleLogoChange}
                    bucket="merchant-assets"
                  />
                  <p className="text-[11px] text-muted-foreground/60 font-medium italic">Recommended: 400x100px PNG or JPG with transparent background.</p>
                </div>
                <div className="space-y-4">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Live Preview</Label>
                  <div className="bg-secondary/20 rounded-[20px] border border-border/70 p-8 flex items-center justify-center min-h-[140px] shadow-inner">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo preview" className="max-h-16 object-contain" />
                    ) : (
                      <div className="w-16 h-16 bg-foreground rounded-2xl flex items-center justify-center text-background text-2xl font-black shadow-sm">
                        {merchant?.store_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
  
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Mail className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Email Authentication</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Configure email-based login settings.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-[15px] font-semibold text-foreground">Require Email Verification</Label>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    When enabled, customers must verify their email before logging in.
                  </p>
                </div>
                <Switch 
                  checked={authSettings.email_verification_required} 
                  onCheckedChange={(checked) => setAuthSettings(prev => ({ 
                    ...prev, 
                    email_verification_required: checked 
                  }))}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
  
              {!authSettings.email_verification_required && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-[20px]">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-semibold text-amber-400">Security Warning</p>
                    <p className="text-[13px] text-amber-300/75 mt-1 leading-relaxed">
                      Disabling email verification may increase spam accounts. Customers will be able to login immediately after signup.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
  
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Google Sign-In</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Allow customers to sign in with their Google account.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-[20px] border border-border/70 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-[15px] font-semibold text-foreground">Enable Google Sign-In</Label>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Customers can use their Google account to sign in to your store.
                  </p>
                </div>
                <Switch 
                  checked={authSettings.google_login_enabled} 
                  onCheckedChange={(checked) => setAuthSettings(prev => ({ 
                    ...prev, 
                    google_login_enabled: checked 
                  }))}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
  
              {authSettings.google_login_enabled && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <Separator className="bg-border/60" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Google Client ID</Label>
                      <Input 
                        value={authSettings.google_client_id || ''}
                        onChange={(e) => setAuthSettings(prev => ({ 
                          ...prev, 
                          google_client_id: e.target.value || null 
                        }))}
                        placeholder="123456789-abc123.apps.googleusercontent.com"
                        className="h-11 bg-secondary/20 border-border/70 font-mono text-[13.5px] rounded-[12px] px-4 focus:ring-1 focus:ring-emerald-500/20"
                      />
                      <p className="text-[11px] text-muted-foreground/60 font-medium italic px-0.5">
                        Get this from the Google Cloud Console.
                      </p>
                    </div>
  
                    <div className="p-5 bg-secondary/20 border border-border/70 rounded-[20px] space-y-3 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground/60" /> Setup Instructions
                      </p>
                      <ol className="text-[13px] text-muted-foreground/85 space-y-2 list-decimal pl-5 leading-relaxed font-medium">
                        <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline font-bold">Google Cloud Console <ExternalLink className="w-3.5 h-3.5 inline" /></a></li>
                        <li>Create a new OAuth 2.0 Client ID (Web application)</li>
                        <li>Add your store URL to Authorized JavaScript origins</li>
                        <li>Copy the Client ID and paste it above</li>
                      </ol>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
  
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Eye className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Identity Interface Preview</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">How your customers see the login experience.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              <div className="bg-secondary/20 rounded-[32px] p-12 border border-border/70 shadow-inner">
                <div className="max-w-sm mx-auto bg-white rounded-[24px] shadow-2xl overflow-hidden border border-black/5">
                  <div className="p-8 text-center border-b border-black/[0.03] bg-secondary/5">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-12 mx-auto object-contain" />
                    ) : (
                      <div className="w-14 h-14 bg-foreground rounded-2xl flex items-center justify-center mx-auto text-background text-xl font-black shadow-sm">
                        {merchant?.store_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                    )}
                    <p className="text-[13px] text-muted-foreground mt-4 font-medium">Welcome back! Sign in to continue</p>
                  </div>
                  <div className="p-8 space-y-5">
                    <div className="h-12 bg-secondary/10 rounded-xl border border-black/[0.05]" />
                    <div className="h-12 bg-secondary/10 rounded-xl border border-black/[0.05]" />
                    <div className="h-12 bg-foreground rounded-xl shadow-md" />
                    
                    {authSettings.google_login_enabled && (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-px bg-black/[0.05]" />
                          <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">or</span>
                          <div className="flex-1 h-px bg-black/[0.05]" />
                        </div>
                        <div className="h-12 bg-white rounded-xl border border-black/[0.08] flex items-center justify-center gap-3 shadow-sm hover:bg-secondary/5 transition-colors">
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="text-[14px] font-bold text-black/80">Continue with Google</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
  
              {subdomain && (
                <div className="mt-6 text-center">
                  <Link 
                    href={`/store/${subdomain}/login`} 
                    target="_blank"
                    className="text-[13px] text-foreground hover:underline inline-flex items-center gap-1.5 font-bold"
                  >
                    View live login page <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
}
