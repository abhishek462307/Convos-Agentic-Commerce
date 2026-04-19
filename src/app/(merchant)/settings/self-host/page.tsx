"use client"

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Copy, Database, Globe, KeyRound, Loader2, PackageCheck, Rocket, Server, ShieldCheck, Sparkles, TerminalSquare, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';

type StatusResponse = {
  appUrl: string
  merchant: {
    subdomain: string | null
    customDomain: string | null
  }
  checks: Record<string, { ok: boolean; detail: string }>
}

const envVars = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, note: 'Public Supabase project URL.' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, note: 'Public client key for browser auth and reads.' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, note: 'Server-side Supabase admin key.' },
  { name: 'NEXT_PUBLIC_APP_URL', required: true, note: 'Base URL for your deployment, e.g. https://shop.example.com.' },
  { name: 'STRIPE_SECRET_KEY', required: false, note: 'Needed if you want hosted Stripe payments.' },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false, note: 'Public Stripe key for checkout surfaces.' },
  { name: 'OPENAI_API_KEY', required: false, note: 'Standard OpenAI API key for GPT models.' },
  { name: 'OPENAI_MODEL', required: false, note: 'Optional default OpenAI model, e.g. gpt-4o.' },
  { name: 'ANTHROPIC_API_KEY', required: false, note: 'Anthropic API key for Claude models.' },
  { name: 'ANTHROPIC_MODEL', required: false, note: 'Optional default Anthropic model, e.g. claude-sonnet-4-20250514.' },
  { name: 'AZURE_OPENAI_API_KEY', required: false, note: 'Azure OpenAI API key if you prefer Azure-hosted models.' },
  { name: 'AZURE_OPENAI_ENDPOINT', required: false, note: 'Azure OpenAI endpoint.' },
  { name: 'AZURE_OPENAI_DEPLOYMENT_NAME', required: false, note: 'Azure model deployment name used by AI routes.' },
  { name: 'MIGRATION_SECRET', required: false, note: 'Protects migration endpoints if you use them.' },
];

const deploymentProviders = {
  vercel: {
    label: 'Vercel',
    summary: 'Best default for this Next.js app. Strong App Router support, previews, env management, and simple custom domain flow.',
    steps: [
      'Import the repo into Vercel and keep the framework preset as Next.js.',
      'Add production env vars in the Vercel project settings before the first deploy.',
      'Set NEXT_PUBLIC_APP_URL to your final production domain, not the preview URL.',
      'Configure custom domains in Vercel and mirror the same domain in Supabase auth settings.',
      'If you use scheduled jobs, keep vercel.json cron entries enabled in production.',
    ],
    command: 'vercel --prod',
    recommendation: 'Recommended for the smoothest deployment path.',
    envBlock: ['NEXT_PUBLIC_APP_URL=https://your-domain.com', 'NEXT_PUBLIC_SUPABASE_URL=...', 'NEXT_PUBLIC_SUPABASE_ANON_KEY=...', 'SUPABASE_SERVICE_ROLE_KEY=...', 'STRIPE_SECRET_KEY=', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=', 'OPENAI_API_KEY=', 'OPENAI_MODEL=gpt-4o', 'ANTHROPIC_API_KEY=', 'ANTHROPIC_MODEL=claude-sonnet-4-20250514', 'AZURE_OPENAI_API_KEY=', 'AZURE_OPENAI_ENDPOINT=', 'AZURE_OPENAI_DEPLOYMENT_NAME=', 'MIGRATION_SECRET='].join('\n'),
    assets: ['vercel.json'],
  },
  netlify: {
    label: 'Netlify',
    summary: 'Good option if your team already uses Netlify. Verify your Next.js runtime behavior carefully for server routes and scheduled tasks.',
    steps: [
      'Create a new Netlify site from the repo and set the build command to npm run build.',
      'Add the same runtime env vars in Netlify site settings before deployment.',
      'Set NEXT_PUBLIC_APP_URL to the primary production domain after assigning it.',
      'Double-check App Router routes, API endpoints, auth callbacks, and uploads on the deployed site.',
      'Use Netlify scheduling or external cron tooling for periodic jobs if needed.',
    ],
    command: 'npm run build',
    recommendation: 'Works best when you already standardize on Netlify.',
    envBlock: ['NEXT_PUBLIC_APP_URL=https://your-netlify-domain.com', 'NEXT_PUBLIC_SUPABASE_URL=...', 'NEXT_PUBLIC_SUPABASE_ANON_KEY=...', 'SUPABASE_SERVICE_ROLE_KEY=...', 'STRIPE_SECRET_KEY=', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=', 'OPENAI_API_KEY=', 'OPENAI_MODEL=gpt-4o', 'ANTHROPIC_API_KEY=', 'ANTHROPIC_MODEL=claude-sonnet-4-20250514', 'AZURE_OPENAI_API_KEY=', 'AZURE_OPENAI_ENDPOINT=', 'AZURE_OPENAI_DEPLOYMENT_NAME=', 'MIGRATION_SECRET='].join('\n'),
    assets: ['netlify.toml'],
  },
  next: {
    label: 'Generic Host',
    summary: 'Use this for Docker, Railway, Fly.io, Render, or your own infrastructure.',
    steps: [
      'Install dependencies and run npm run build in CI or your image build step.',
      'Expose the app with npm run start behind HTTPS and a reverse proxy.',
      'Set NEXT_PUBLIC_APP_URL to the externally reachable application origin.',
      'Persist env vars securely and protect secrets at the deployment level.',
      'Add a cron runner for periodic routes if your host does not support scheduled jobs natively.',
    ],
    command: 'docker compose up --build',
    recommendation: 'Best when you need full infrastructure control.',
    envBlock: ['NEXT_PUBLIC_APP_URL=https://app.example.com', 'NEXT_PUBLIC_SUPABASE_URL=...', 'NEXT_PUBLIC_SUPABASE_ANON_KEY=...', 'SUPABASE_SERVICE_ROLE_KEY=...', 'STRIPE_SECRET_KEY=', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=', 'OPENAI_API_KEY=', 'OPENAI_MODEL=gpt-4o', 'ANTHROPIC_API_KEY=', 'ANTHROPIC_MODEL=claude-sonnet-4-20250514', 'AZURE_OPENAI_API_KEY=', 'AZURE_OPENAI_ENDPOINT=', 'AZURE_OPENAI_DEPLOYMENT_NAME=', 'MIGRATION_SECRET='].join('\n'),
    assets: ['Dockerfile', 'docker-compose.yml'],
  },
} as const;

const faqs = [
  {
    id: 'supabase',
    question: 'What is the minimum stack required to boot?',
    answer: 'Supabase, the public app URL, and whichever AI/payment integrations you actually use. The merchant dashboard and storefront can run without optional providers if the related features stay disabled.',
  },
  {
    id: 'domains',
    question: 'How should I think about domains in self-hosted mode?',
    answer: 'Set NEXT_PUBLIC_APP_URL to your deployed host. For merchant storefronts, use the built-in /store/[subdomain] path or configure custom domains inside merchant settings after your DNS is ready.',
  },
  {
    id: 'mcp',
    question: 'Does MCP still work when self-hosted?',
    answer: 'Yes. MCP routes remain available. Point clients to your own deployment URL and regenerate merchant MCP keys from settings if needed.',
  },
  {
    id: 'payments',
    question: 'Can I skip Stripe during setup?',
    answer: 'Yes. Stripe is optional unless you want the hosted payment and checkout flows. You can still test most dashboard, storefront, and AI surfaces without it.',
  },
];

export default function SelfHostSetupPage() {
  const { merchant } = useMerchant();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const merchantSubdomain = merchant?.subdomain || 'your-store';

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const response = await fetch('/api/self-host/status', { credentials: 'include' });
        const data = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(data.error || 'Failed to load status');
        setStatus(data);
      } catch (error: any) {
        if (!active) return;
        toast.error(error.message || 'Failed to load self-host status');
      } finally {
        if (active) setStatusLoading(false);
      }
    };

    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const envTemplate = useMemo(() => {
    return [
      `NEXT_PUBLIC_APP_URL=${appUrl}`,
      'NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key',
      'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key',
      'STRIPE_SECRET_KEY=',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=',
      'OPENAI_API_KEY=',
      'OPENAI_MODEL=gpt-4o',
      'ANTHROPIC_API_KEY=',
      'ANTHROPIC_MODEL=claude-sonnet-4-20250514',
      'AZURE_OPENAI_API_KEY=',
      'AZURE_OPENAI_ENDPOINT=',
      'AZURE_OPENAI_DEPLOYMENT_NAME=',
      'MIGRATION_SECRET=',
    ].join('\n');
  }, [appUrl]);

  const deploymentSnippet = useMemo(() => {
    return [
      'git clone <your-fork>',
      'cd convos',
      'npm ci',
      'cp .env.example .env.local',
      'npm run dev',
    ].join('\n');
  }, []);

  const merchantUrls = useMemo(() => {
    return {
      dashboard: `${appUrl}/dashboard`,
      storefront: `${appUrl}/store/${merchantSubdomain}`,
      mcp: merchant?.id ? `${appUrl}/api/mcp/${merchant.id}` : `${appUrl}/api/mcp`,
      adminMcp: merchant?.id ? `${appUrl}/api/mcp/admin?merchantId=${merchant.id}` : `${appUrl}/api/mcp/admin`,
    };
  }, [appUrl, merchantSubdomain, merchant?.id]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const checks = status?.checks ? Object.entries(status.checks) : [];
  const readyCount = checks.filter(([, value]) => value.ok).length;
  const totalCount = checks.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full border-border/70 bg-card px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/85 shadow-sm">Infrastructure</Badge>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Self-Hosted Runtime</span>
          </div>
          <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Self-Host Setup</h2>
          <p className="mt-1 max-w-3xl text-[15px] text-muted-foreground">A single control surface for booting your own deployment, validating runtime readiness, and choosing the best launch path for Vercel, Netlify, or a generic Next.js host.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11 rounded-[16px] px-5 text-[11px] font-bold uppercase tracking-[0.12em]" onClick={() => copy(envTemplate, 'Env template')}>
            <Copy className="mr-2 h-4 w-4" />Copy Env Template
          </Button>
          <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11 rounded-[16px] px-5 text-[11px] font-bold uppercase tracking-[0.12em]" asChild>
            <Link href="/setup">Open Setup Wizard</Link>
          </Button>
          <Button className="h-11 rounded-[16px] bg-foreground px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-background hover:bg-foreground/90" onClick={() => copy(deploymentSnippet, 'Quickstart commands')}>
            <Rocket className="mr-2 h-4 w-4" />Copy Quickstart
          </Button>
        </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background">
                <Server className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold tracking-tight">Live Deployment Status</CardTitle>
                <CardDescription className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">Realtime checks against the current merchant context and server env configuration.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {statusLoading ? (
              <div className="flex items-center gap-3 rounded-[18px] border border-border/60 bg-secondary/15 px-4 py-4 text-[14px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Checking runtime status…
              </div>
            ) : (
              <>
                <div className="rounded-[18px] border border-border/60 bg-secondary/15 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">Readiness</p>
                      <p className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">{readyCount}/{totalCount || 0} checks ready</p>
                    </div>
                    <Badge variant={readyCount === totalCount ? 'default' : 'secondary'} className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                      {readyCount === totalCount ? 'Ready to Launch' : 'Needs Review'}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {checks.map(([key, value]) => (
                    <div key={key} className="rounded-[18px] border border-border/60 bg-secondary/15 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">{key}</p>
                        {value.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <TriangleAlert className="h-4 w-4 text-amber-500" />}
                      </div>
                      <p className="text-[13px] leading-6 text-muted-foreground">{value.detail}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background">
                <Globe className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold tracking-tight">Deployment URLs</CardTitle>
                <CardDescription className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">Useful URLs for testing, support, and MCP clients.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {Object.entries(merchantUrls).map(([key, value]) => (
              <div key={key} className="rounded-[18px] border border-border/60 bg-secondary/15 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">{key}</p>
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl px-3 text-[11px] font-bold uppercase tracking-[0.12em]" onClick={() => copy(value, key)}>
                    Copy
                  </Button>
                </div>
                <p className="break-all font-mono text-[12.5px] text-foreground/85">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deployment" className="space-y-4">
        <TabsList className="h-auto rounded-[18px] border border-border/70 bg-card p-1">
          <TabsTrigger value="deployment" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">Deployment Flow</TabsTrigger>
          <TabsTrigger value="environment" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">Environment</TabsTrigger>
          <TabsTrigger value="providers" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">Providers</TabsTrigger>
          <TabsTrigger value="launch" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">Launch</TabsTrigger>
        </TabsList>

        <TabsContent value="deployment">
          <Tabs defaultValue="vercel" className="space-y-4">
            <TabsList className="h-auto rounded-[18px] border border-border/70 bg-card p-1">
              <TabsTrigger value="vercel" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">Vercel</TabsTrigger>
              <TabsTrigger value="netlify" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">Netlify</TabsTrigger>
              <TabsTrigger value="next" className="rounded-[14px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]">Generic Host</TabsTrigger>
            </TabsList>

            {Object.entries(deploymentProviders).map(([key, provider]) => (
              <TabsContent key={key} value={key}>
                <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
                  <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-5">
                    <CardTitle className="text-[17px] font-semibold tracking-tight">{provider.label} Deployment</CardTitle>
                    <CardDescription className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{provider.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
                    <div className="rounded-[18px] border border-border/60 bg-secondary/15 p-4 text-[13px] leading-6 text-muted-foreground">
                      <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                        <AlertCircle className="h-4 w-4" />Recommendation
                      </div>
                      <p>{provider.recommendation}</p>
                    </div>
                    <div className="space-y-3">
                      {provider.steps.map((step, index) => (
                        <div key={step} className="flex items-start gap-3 rounded-[18px] border border-border/60 bg-secondary/15 px-4 py-4">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-bold text-foreground shadow-sm">{index + 1}</div>
                          <p className="text-[14px] leading-6 text-foreground/90">{step}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                      <div className="rounded-[20px] border border-border/60 bg-[#0b0b0c] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                          <span className="flex items-center gap-2"><TerminalSquare className="h-4 w-4" />Command</span>
                          <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 hover:text-white" onClick={() => copy(provider.command, `${provider.label} command`)}>Copy</Button>
                        </div>
                        <Textarea readOnly value={provider.command} className="min-h-[72px] border-0 bg-transparent p-0 font-mono text-[12.5px] leading-6 text-zinc-200 shadow-none focus-visible:ring-0" />
                      </div>
                      <div className="rounded-[20px] border border-border/60 bg-[#0b0b0c] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                          <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Env Block</span>
                          <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 hover:text-white" onClick={() => copy(provider.envBlock, `${provider.label} env block`)}>Copy</Button>
                        </div>
                        <Textarea readOnly value={provider.envBlock} className="min-h-[180px] border-0 bg-transparent p-0 font-mono text-[12.5px] leading-6 text-zinc-200 shadow-none focus-visible:ring-0" />
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-border/60 bg-secondary/15 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">Deployment assets</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {provider.assets.map((asset) => (
                          <Badge key={asset} variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.08em]">{asset}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="environment">
          <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-5">
              <CardTitle className="text-[17px] font-semibold tracking-tight">Environment File</CardTitle>
              <CardDescription className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">Start from these variables and fill only the integrations you plan to enable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <Textarea readOnly value={envTemplate} className="min-h-[260px] rounded-[18px] border-border/70 bg-secondary/15 font-mono text-[12.5px] leading-6" />
              <div className="grid gap-3 md:grid-cols-2">
                {envVars.map((item) => (
                  <div key={item.name} className="rounded-[18px] border border-border/60 bg-secondary/15 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <code className="text-[12px] font-bold text-foreground">{item.name}</code>
                      <Badge variant={item.required ? 'default' : 'secondary'} className="rounded-full px-2 py-0 text-[10px] uppercase tracking-[0.12em]">{item.required ? 'Required' : 'Optional'}</Badge>
                    </div>
                    <p className="text-[13px] leading-6 text-muted-foreground">{item.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[16px] font-semibold tracking-tight"><Database className="h-4 w-4" />Supabase</CardTitle>
                <CardDescription>Auth, database, storage, and admin access all depend on your project config.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px] leading-6 text-muted-foreground">
                <p>Create a project, set auth redirect URLs, add your production domain, and load your schema before inviting merchants.</p>
                <Separator />
                <p>Use merchant settings to confirm store metadata, domains, and MCP keys after the app boots.</p>
              </CardContent>
            </Card>
            <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[16px] font-semibold tracking-tight"><KeyRound className="h-4 w-4" />AI Providers</CardTitle>
                <CardDescription>OpenAI, Anthropic, and Azure OpenAI are supported. Only configure the providers your deployment actually needs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px] leading-6 text-muted-foreground">
                <p>Add API credentials only for AI routes you intend to expose. MCP and merchant tooling will use those same runtime keys.</p>
                <Separator />
                <p>Use HTTPS in production for auth callbacks, checkout flows, and any browser-facing AI features.</p>
              </CardContent>
            </Card>
            <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[16px] font-semibold tracking-tight"><ShieldCheck className="h-4 w-4" />Payments & Access</CardTitle>
                <CardDescription>Stripe, SMTP, WhatsApp, and MCP are optional. Enable them intentionally rather than by default.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-[13px] leading-6 text-muted-foreground">
                <p>If Stripe is unset, avoid hosted card flows until payment methods are configured in merchant settings.</p>
                <Separator />
                <p>Add an MCP API key for production if you want a shared access control layer in front of the MCP routes.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="launch">
          <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-5">
              <CardTitle className="text-[17px] font-semibold tracking-tight">Quickstart</CardTitle>
              <CardDescription className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">Use this when handing the repo to another operator or spinning up a fresh environment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="rounded-[20px] border border-border/60 bg-[#0b0b0c] p-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  <span className="flex items-center gap-2"><TerminalSquare className="h-4 w-4" />Terminal</span>
                  <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 hover:text-white" onClick={() => copy(deploymentSnippet, 'Quickstart commands')}>Copy</Button>
                </div>
                <Textarea readOnly value={deploymentSnippet} className="min-h-[140px] border-0 bg-transparent p-0 font-mono text-[12.5px] leading-6 text-zinc-200 shadow-none focus-visible:ring-0" />
              </div>
              <div className="rounded-[18px] border border-border/60 bg-secondary/15 p-4 text-[13px] leading-6 text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <PackageCheck className="h-4 w-4" />Operator Notes
                </div>
                <p>After the app boots, create a merchant account, complete the setup wizard, then review payments, domains, SEO, MCP, and AI settings from the merchant settings sidebar before exposing the deployment publicly.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="rounded-[24px] border-border/70 bg-card shadow-sm">
        <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background">
              <Sparkles className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-[17px] font-semibold tracking-tight">Self-Host FAQ</CardTitle>
              <CardDescription className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">The questions operators usually ask before moving from local evaluation to a stable deployment.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id} className="border-border/70">
                <AccordionTrigger className="py-4 text-[14px] font-semibold text-foreground hover:no-underline">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-[13px] leading-6 text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
