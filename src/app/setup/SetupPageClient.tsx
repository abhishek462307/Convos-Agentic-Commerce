"use client"

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Loader2, Rocket, Server, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';

const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const currencies = [
  { value: 'USD', locale: 'en-US' },
  { value: 'EUR', locale: 'de-DE' },
  { value: 'GBP', locale: 'en-GB' },
  { value: 'INR', locale: 'en-IN' },
];

type SetupStatus = {
  hasMerchant: boolean
  merchantCount: number
  deployment?: {
    appUrl?: string
    isVercel?: boolean
  }
  merchant?: {
    id?: string
    store_name?: string
    store_email?: string
    currency?: string
    locale?: string
    smtp_enabled?: boolean
    smtp_host?: string
    smtp_from_email?: string
    ai_tone?: string
    ai_custom_instructions?: string
    custom_domain?: string | null
  }
  checks: Record<string, { ok: boolean; detail: string }>
}

export default function SetupPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [form, setForm] = useState({
    storeName: '',
    customDomain: '',
    storeEmail: '',
    storeIndustry: 'Other',
    currency: 'USD',
    locale: 'en-US',
    primaryColor: '#8b5cf6',
    aiTone: 'friendly',
    aiCustomInstructions: '',
    smtpEnabled: false,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpFromName: '',
  });

  useEffect(() => {
    let active = true;
    const nextPath = searchParams.get('next') || '/setup';

    const load = async () => {
      try {
        const res = await fetch('/api/setup/initial', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!active) return;

        if (res.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load setup status');
        }

        setStatus(data);
        if (data.hasMerchant) {
          router.replace('/dashboard');
          return;
        }
      } catch (error: any) {
        if (!active) return;
        toast.error(error.message || 'Failed to load initial setup');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [router, searchParams]);

  const checks = useMemo(() => Object.entries(status?.checks || {}), [status]);
  const blockingChecks = useMemo(() => checks.filter((entry) => ['supabase', 'schema', 'appUrl'].includes(entry[0]) && !entry[1].ok), [checks]);

  useEffect(() => {
    if (!status) return;

    setForm((prev) => ({
      ...prev,
      smtpFromEmail: prev.smtpFromEmail || status.merchant?.smtp_from_email || prev.storeEmail,
    }));
  }, [status]);

  useEffect(() => {
    if (!status?.deployment?.appUrl) return;
    if (form.customDomain.trim()) return;

    try {
      const hostname = new URL(status.deployment.appUrl).hostname;
      if (hostname && !hostname.includes('localhost') && !hostname.includes('127.0.0.1') && !hostname.endsWith('.vercel.app')) {
        setForm((prev) => ({ ...prev, customDomain: hostname }));
      }
    } catch {
      // ignore invalid app url
    }
  }, [status?.deployment?.appUrl, form.customDomain]);

  const handleSubmit = async () => {
    if (!form.storeName.trim() || !form.storeEmail.trim()) {
      toast.error('Store name and store email are required');
      return;
    }

    if (blockingChecks.length > 0) {
      toast.error('Finish the required deployment steps before completing setup');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/setup/initial', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.replace(`/login?next=${encodeURIComponent('/setup')}`);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete setup');
      }
      toast.success('Initial setup complete');
      router.push('/dashboard?welcome=true');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete setup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Badge className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-200">First Run Setup</Badge>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-[28px] border-white/10 bg-white/[0.03] shadow-2xl shadow-black/30">
            <CardHeader className="border-b border-white/10 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Server className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-white">Deployment Readiness</CardTitle>
                  <CardDescription className="mt-1 text-sm text-zinc-400">Before the first store is created, make sure the deployment runtime is ready.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {checks.map(([key, check]) => (
                <div key={key} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{key}</p>
                    {check.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <ShieldCheck className="h-4 w-4 text-amber-400" />}
                  </div>
                  <p className="text-sm leading-6 text-zinc-300">{check.detail}</p>
                </div>
              ))}
              {status?.deployment?.isVercel && (
                <div className="rounded-[18px] border border-violet-500/20 bg-violet-500/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-200">Vercel deployment detected</p>
                  <p className="mt-2 text-sm leading-6 text-violet-100">
                    This setup uses <span className="font-semibold">{status.deployment.appUrl || 'your Vercel URL'}</span> as the deployment base. Add the same URL to Supabase Auth redirect URLs before testing signup, login, and checkout callbacks.
                  </p>
                </div>
              )}
              {blockingChecks.length > 0 && (
                <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">Action required before merchant creation</p>
                  <div className="mt-2 space-y-2 text-sm leading-6 text-amber-50">
                    {blockingChecks.map(([key, check]) => (
                      <p key={key}>• {check.detail}</p>
                    ))}
                  </div>
                </div>
              )}
              {blockingChecks.some(([key]) => key === 'schema') && (
                <div className="rounded-[18px] border border-sky-500/20 bg-sky-500/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-sky-100">Database bootstrap order</p>
                  <div className="mt-2 space-y-1 text-sm leading-6 text-sky-50">
                    <p>1. Run <span className="font-semibold">base_schema.sql</span></p>
                    <p>2. Run <span className="font-semibold">migration.sql</span></p>
                    <p>3. Run <span className="font-semibold">01_rls_migration.sql</span></p>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-sky-100/85">After running those SQL files in Supabase, refresh this page and complete setup.</p>
                </div>
              )}
              <div className="rounded-[18px] border border-violet-500/20 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100">
                This setup creates the first merchant workspace, configures store identity, applies AI defaults, and optionally stores merchant SMTP credentials.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/10 bg-white/[0.03] shadow-2xl shadow-black/30">
            <CardHeader className="border-b border-white/10 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold tracking-tight text-white">Initial Workspace Setup</CardTitle>
                  <CardDescription className="mt-1 text-sm text-zinc-400">Collect the minimum required information to make the deployment usable immediately.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="store" className="space-y-5">
                <TabsList className="h-auto rounded-[18px] border border-white/10 bg-white/[0.03] p-1">
                  <TabsTrigger value="store" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">Store</TabsTrigger>
                  <TabsTrigger value="ai" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">AI</TabsTrigger>
                  <TabsTrigger value="smtp" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">SMTP</TabsTrigger>
                </TabsList>

                <TabsContent value="store" className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Store name</Label>
                      <Input value={form.storeName} onChange={(e) => setForm((prev) => ({ ...prev, storeName: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Store email</Label>
                      <Input value={form.storeEmail} onChange={(e) => setForm((prev) => ({ ...prev, storeEmail: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white" />
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-[1fr_0.8fr_0.8fr]">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Custom domain (optional)</Label>
                      <Input value={form.customDomain} onChange={(e) => setForm((prev) => ({ ...prev, customDomain: e.target.value }))} placeholder="shop.yourbrand.com" className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Currency</Label>
                      <select value={form.currency} onChange={(e) => {
                        const selected = currencies.find((item) => item.value === e.target.value)
                        setForm((prev) => ({ ...prev, currency: e.target.value, locale: selected?.locale || prev.locale }))
                      }} className="h-11 w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white">
                        {currencies.map((currency) => <option key={currency.value} value={currency.value}>{currency.value}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Industry</Label>
                      <Input value={form.storeIndustry} onChange={(e) => setForm((prev) => ({ ...prev, storeIndustry: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Primary brand color</Label>
                    <div className="flex flex-wrap gap-3">
                      {colors.map((color) => (
                        <button key={color} type="button" onClick={() => setForm((prev) => ({ ...prev, primaryColor: color }))} className={`h-10 w-10 rounded-full border-2 transition ${form.primaryColor === color ? 'border-white scale-110' : 'border-transparent opacity-80'}`} style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">AI tone</Label>
                      <select value={form.aiTone} onChange={(e) => setForm((prev) => ({ ...prev, aiTone: e.target.value }))} className="h-11 w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white">
                        <option value="friendly">Friendly</option>
                        <option value="professional">Professional</option>
                        <option value="playful">Playful</option>
                        <option value="luxury">Luxury</option>
                      </select>
                    </div>
                    <div className="rounded-[18px] border border-violet-500/20 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100">
                      AI provider envs are configured at the deployment level. This step sets the first merchant-facing tone and instructions.
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Custom instructions</Label>
                    <Textarea value={form.aiCustomInstructions} onChange={(e) => setForm((prev) => ({ ...prev, aiCustomInstructions: e.target.value }))} className="min-h-[180px] rounded-[18px] border-white/10 bg-white/[0.04] text-white" placeholder="Example: Be concise, mention shipping timelines, and guide shoppers toward the best fit instead of listing everything." />
                  </div>
                </TabsContent>

                <TabsContent value="smtp" className="space-y-5">
                  <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Configure merchant SMTP now</p>
                      <p className="mt-1 text-sm text-zinc-400">Optional. Skip this if deployment-level SMTP is enough for your setup.</p>
                    </div>
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, smtpEnabled: !prev.smtpEnabled }))} className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ${form.smtpEnabled ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'}`}>
                      {form.smtpEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">SMTP host</Label>
                      <Input disabled={!form.smtpEnabled} value={form.smtpHost} onChange={(e) => setForm((prev) => ({ ...prev, smtpHost: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white disabled:opacity-40" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">Port</Label>
                      <Input disabled={!form.smtpEnabled} value={form.smtpPort} onChange={(e) => setForm((prev) => ({ ...prev, smtpPort: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white disabled:opacity-40" />
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">SMTP user</Label>
                      <Input disabled={!form.smtpEnabled} value={form.smtpUser} onChange={(e) => setForm((prev) => ({ ...prev, smtpUser: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white disabled:opacity-40" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">SMTP password</Label>
                      <Input type="password" disabled={!form.smtpEnabled} value={form.smtpPassword} onChange={(e) => setForm((prev) => ({ ...prev, smtpPassword: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white disabled:opacity-40" />
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">From email</Label>
                      <Input disabled={!form.smtpEnabled} value={form.smtpFromEmail} onChange={(e) => setForm((prev) => ({ ...prev, smtpFromEmail: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white disabled:opacity-40" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">From name</Label>
                      <Input disabled={!form.smtpEnabled} value={form.smtpFromName} onChange={(e) => setForm((prev) => ({ ...prev, smtpFromName: e.target.value }))} className="h-11 rounded-[14px] border-white/10 bg-white/[0.04] text-white disabled:opacity-40" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-400">You can refine payments, domains, SEO, MCP, and notifications from the dashboard after setup.</p>
                <Button onClick={handleSubmit} disabled={saving || blockingChecks.length > 0} className="h-11 rounded-[16px] bg-white px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-black hover:bg-zinc-200 disabled:bg-zinc-500 disabled:text-zinc-200">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {blockingChecks.length > 0 ? 'Complete Required Steps' : 'Complete Setup'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
