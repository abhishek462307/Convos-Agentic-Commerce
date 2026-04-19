"use client"

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Globe,
  CheckCircle2,
  Loader2,
  Copy,
  RefreshCw,
  Trash2,
  ArrowRight,
  Clock,
  ShieldCheck,
  XCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

type VerificationStatus = 'idle' | 'checking' | 'verified' | 'failed' | 'pending_dns';

export default function DomainSettingsPage() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [customDomain, setCustomDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [removing, setRemoving] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (merchant?.custom_domain) {
      setCustomDomain(merchant.custom_domain);
      if (merchant.domain_verified) {
        setVerificationStatus('verified');
      }
    }
  }, [merchant]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const cleanDomain = (input: string) => {
    return input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .replace(/^www\./, '');
  };

  const isValidDomain = (domain: string) => {
    const pattern = /^([a-z0-9-]+\.)+[a-z]{2,}$/;
    return pattern.test(domain);
  };

  const handleSaveDomain = async () => {
    if (!merchant) return;

    const domain = cleanDomain(customDomain);

    if (!domain) {
      toast.error('Please enter a domain');
      return;
    }

    if (!isValidDomain(domain)) {
      toast.error('Please enter a valid domain (e.g. shop.yourbrand.com)');
      return;
    }

    setSaving(true);
    setVerificationStatus('idle');

    const response = await fetch('/api/merchant/settings/update', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { custom_domain: domain, domain_verified: false } }),
    });

    if (!response.ok) {
      toast.error('Failed to save domain');
    } else {
      setCustomDomain(domain);
      toast.success('Domain saved — now configure your DNS records below');
      setVerificationStatus('pending_dns');
      refetch();
    }
    setSaving(false);
  };

  const handleVerifyDomain = useCallback(async () => {
    if (!merchant?.custom_domain) return;

    setVerificationStatus('checking');
    setVerificationMessage('');

    try {
      const res = await fetch('/api/verify-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId: merchant.id,
          domain: merchant.custom_domain,
        }),
      });

      const data = await res.json();

      if (data.verified) {
        setVerificationStatus('verified');
        setVerificationMessage('');
        if (pollRef.current) clearInterval(pollRef.current);
        toast.success('Domain verified and connected!');
        refetch();
      } else {
        setVerificationStatus('failed');
        setVerificationMessage(data.message || 'DNS records not found yet.');
      }
    } catch {
      setVerificationStatus('failed');
      setVerificationMessage('Verification request failed. Please try again.');
    }
  }, [merchant, refetch]);

  const startAutoVerify = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    handleVerifyDomain();
    pollRef.current = setInterval(() => {
      handleVerifyDomain();
    }, 30000);
    toast.info('Auto-checking every 30 seconds. You can close this page.');
  };

  const handleRemoveDomain = async () => {
    if (!merchant) return;
    setRemoving(true);

    const response = await fetch('/api/merchant/settings/update', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { custom_domain: null, domain_verified: false } }),
    });

    if (!response.ok) {
      toast.error('Failed to remove domain');
    } else {
      setCustomDomain('');
      setVerificationStatus('idle');
      setVerificationMessage('');
      if (pollRef.current) clearInterval(pollRef.current);
      toast.success('Domain removed');
      refetch();
    }
    setRemoving(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  if (merchantLoading) {
    return <MerchantPageSkeleton />;
  }

  const hasDomain = !!merchant?.custom_domain;
  const isVerified = merchant?.domain_verified;
  const isSubdomain = hasDomain && merchant.custom_domain!.split('.').length > 2;
  const appHost = (() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    if (!appUrl) return 'your-app-domain.com';
    try {
      return new URL(appUrl).hostname.replace(/^www\./, '');
    } catch {
      return appUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '');
    }
  })();
  const rootARecord = (process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_A_RECORD || '').trim();

  const dnsRecords = hasDomain
    ? isSubdomain
      ? [
          {
            type: 'CNAME',
            name: merchant.custom_domain!.split('.')[0],
            value: appHost,
            description: 'Points your subdomain to your storefront host',
          },
        ]
      : ([
          {
            type: 'CNAME',
            name: 'www',
            value: appHost,
            description: 'Points www to your storefront host',
          },
          ...(rootARecord
            ? [{
                type: 'A',
                name: '@',
                value: rootARecord,
                description: 'Points root domain to your storefront host',
              }]
            : []),
        ])
    : [];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Custom Domain</h2>
          <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">
            Connect your own domain so customers visit your store on your brand URL.
          </p>
        </div>

        {/* Custom Domain Setup */}
        <Card className="border-border bg-card rounded-[24px] overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/70 py-4 px-6 bg-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center border border-border/70">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Custom Domain</CardTitle>
                  <CardDescription className="text-[13px] text-muted-foreground mt-0.5">Use your own domain like shop.yourbrand.com or yourbrand.com</CardDescription>
                </div>
              </div>
              {isVerified && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Connected
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Step 1: Enter Domain */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary/30 flex items-center justify-center text-[11px] font-bold text-foreground">1</div>
                <h3 className="text-[14.5px] font-bold text-foreground">Enter your domain</h3>
              </div>

              <div className="pl-8 space-y-3">
                <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Domain name</Label>
                <div className="flex gap-2">
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="shop.yourbrand.com or yourbrand.com"
                    className="h-11 text-[14.5px] flex-1 font-mono bg-secondary/20 border-border/70 rounded-[12px]"
                    disabled={isVerified as boolean}
                  />
                  {!isVerified && (
                    <Button
                      onClick={handleSaveDomain}
                      disabled={saving || !customDomain.trim()}
                      className="h-11 px-6 text-[13px] font-bold uppercase tracking-widest rounded-[12px]"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                  )}
                </div>
                <div className="flex items-start gap-2.5 p-3.5 bg-blue-500/5 rounded-xl border border-blue-500/10">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-blue-300/85 leading-relaxed">
                    You can use a subdomain (shop.yourbrand.com) or a root domain (yourbrand.com). 
                    For root domains, we&apos;ll set up both yourbrand.com and www.yourbrand.com.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Configure DNS */}
            {hasDomain && !isVerified && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary/30 flex items-center justify-center text-[11px] font-bold text-foreground">2</div>
                  <h3 className="text-[14.5px] font-bold text-foreground">Configure DNS records</h3>
                </div>

                <div className="pl-8 space-y-4">
                  <p className="text-[13px] text-muted-foreground">
                    Go to your domain provider (GoDaddy, Namecheap, Cloudflare, etc.) and add {dnsRecords.length === 1 ? 'this record' : 'these records'}:
                  </p>

                  <div className="bg-secondary/20 rounded-xl border border-border/70 overflow-hidden">
                    <div className="grid grid-cols-[80px_1fr_1fr] gap-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 p-4 border-b border-border/70 bg-secondary/30">
                      <span>Type</span>
                      <span>Name / Host</span>
                      <span>Value / Points to</span>
                    </div>
                    {dnsRecords.map((record, i) => (
                      <div key={i} className="grid grid-cols-[80px_1fr_1fr] gap-0 p-4 border-b border-border/70 last:border-0 items-center">
                        <span className="font-mono text-[13px] font-bold text-foreground">{record.type}</span>
                        <div className="flex items-center gap-2">
                          <code className="text-[13px] font-mono bg-secondary/30 text-foreground px-2 py-1 rounded border border-border/60">{record.name}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.name)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-[13px] font-mono bg-secondary/30 text-foreground px-2 py-1 rounded border border-border/60 truncate">{record.value}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.value)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/40 shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/10">
                    <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-amber-300/85 leading-relaxed">
                      DNS changes can take 1–48 hours to propagate. Most providers update within 5–15 minutes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Verify */}
            {hasDomain && !isVerified && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary/30 flex items-center justify-center text-[11px] font-bold text-foreground">3</div>
                  <h3 className="text-[14.5px] font-bold text-foreground">Verify connection</h3>
                </div>

                <div className="pl-8 space-y-4">
                  {verificationStatus === 'checking' && (
                    <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-xl border border-border/70">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-[14px] text-muted-foreground">Checking DNS records...</span>
                    </div>
                  )}

                  {verificationStatus === 'failed' && (
                    <div className="flex items-start gap-3 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[14px] font-semibold text-red-400">Not connected yet</p>
                        <p className="text-[13px] text-red-300/75 mt-1">{verificationMessage}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleVerifyDomain}
                      disabled={verificationStatus === 'checking'}
                      variant="outline"
                      className="h-10 text-[13px] font-semibold px-5 rounded-[12px]"
                    >
                      {verificationStatus === 'checking' ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Check Now
                    </Button>
                    <Button
                      onClick={startAutoVerify}
                      disabled={verificationStatus === 'checking'}
                      variant="ghost"
                      className="h-10 text-[13px] text-muted-foreground hover:text-foreground rounded-[12px]"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Auto-check every 30s
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Verified State */}
            {isVerified && hasDomain && (
              <div className="space-y-4">
                <div className="p-5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-[15px] font-bold text-emerald-400">Domain connected and active</span>
                  </div>
                  <div className="pl-8 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400/60" />
                      <span className="text-[13px] text-emerald-300/75">SSL certificate active (HTTPS)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400/60" />
                      <a
                        href={`https://${merchant!.custom_domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-emerald-300/75 hover:text-emerald-300 underline underline-offset-4"
                      >
                        https://{merchant!.custom_domain}
                      </a>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400/40" />
                      <span className="text-[13px] text-emerald-300/50">live storefront route</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remove Domain */}
            {hasDomain && (
              <div className="pt-4 border-t border-border/60">
                <Button
                  onClick={handleRemoveDomain}
                  disabled={removing}
                  variant="ghost"
                  className="h-9 text-[12px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-[10px]"
                >
                  {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Trash2 className="w-3.5 h-3.5 mr-2" />}
                  Remove Custom Domain
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
