"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Mail,
  Server,
  Lock,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Save,
  ChevronRight,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { Separator } from '@/components/ui/separator';

export default function EmailSettingsPage() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  
  const [settings, setSettings] = useState({
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: ''
  });

  useEffect(() => {
    if (merchant) {
      setSettings({
        smtp_enabled: merchant.smtp_enabled || false,
        smtp_host: merchant.smtp_host || '',
        smtp_port: merchant.smtp_port || 587,
        smtp_user: merchant.smtp_user || '',
        smtp_password: merchant.smtp_password || '',
        smtp_from_email: merchant.smtp_from_email || '',
        smtp_from_name: merchant.smtp_from_name || merchant.store_name || ''
      });
    }
  }, [merchant]);

  const handleSave = async () => {
    if (!merchant) return;
    setSaving(true);

    try {
      const response = await fetch('/api/merchant/settings/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            smtp_enabled: settings.smtp_enabled,
            smtp_host: settings.smtp_host || null,
            smtp_port: settings.smtp_port || null,
            smtp_user: settings.smtp_user || null,
            smtp_password: settings.smtp_password || null,
            smtp_from_email: settings.smtp_from_email || null,
            smtp_from_name: settings.smtp_from_name || null
          }
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      toast.success('Email settings saved');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!merchant || !settings.smtp_host || !settings.smtp_from_email) {
      toast.error('Please configure SMTP settings first');
      return;
    }

    if (!testEmailAddress) {
      toast.error('Please enter an email address to send the test to');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.id,
          testEmail: testEmailAddress
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult('success');
        toast.success('Test email sent successfully!');
      } else {
        setTestResult('error');
        toast.error(data.error || 'Failed to send test email');
      }
    } catch {
      setTestResult('error');
      toast.error('Failed to send test email');
    }
    setTesting(false);
  };

  if (merchantLoading || !merchant) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Communications</Badge>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">SMTP Configuration</span>
          </div>
          <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Email Settings (SMTP)</h2>
          <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Configure your own email server for sending transactional notifications to customers.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <Server className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Custom SMTP Server</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Use your own domain to send emails.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">{settings.smtp_enabled ? 'Enabled' : 'Disabled'}</span>
                  <Switch 
                    checked={settings.smtp_enabled}
                    onCheckedChange={checked => setSettings({ ...settings, smtp_enabled: checked })}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {!settings.smtp_enabled && (
                <div className="p-4 rounded-[16px] bg-amber-500/5 border border-amber-500/15 flex items-start gap-3 shadow-sm mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[13px] font-bold text-amber-600">SMTP is currently inactive</p>
                    <p className="text-[11.5px] text-amber-700/80 font-medium leading-relaxed">
                      Enable custom SMTP to send emails from your own domain. When disabled, emails will use the default system sender.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5 flex items-center gap-2">
                    Host Address
                  </Label>
                  <Input 
                    value={settings.smtp_host}
                    onChange={e => setSettings({ ...settings, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="h-11 bg-secondary/20 border-border/70 text-[14px] rounded-[12px] px-4 font-mono"
                    disabled={!settings.smtp_enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Port Number</Label>
                  <Input 
                    type="number"
                    value={settings.smtp_port}
                    onChange={e => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                    className="h-11 bg-secondary/20 border-border/70 text-[14px] rounded-[12px] px-4"
                    disabled={!settings.smtp_enabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Username</Label>
                  <Input 
                    value={settings.smtp_user}
                    onChange={e => setSettings({ ...settings, smtp_user: e.target.value })}
                    placeholder="your@email.com"
                    className="h-11 bg-secondary/20 border-border/70 text-[14px] rounded-[12px] px-4"
                    disabled={!settings.smtp_enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Password</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      value={settings.smtp_password}
                      onChange={e => setSettings({ ...settings, smtp_password: e.target.value })}
                      placeholder="••••••••"
                      className="h-11 bg-secondary/20 border-border/70 text-[14px] rounded-[12px] px-4 pr-10 font-mono"
                      disabled={!settings.smtp_enabled}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-5">
                <div className="flex items-center gap-2 px-0.5">
                  <User className="w-4 h-4 text-muted-foreground/60" />
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">Sender Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">From Email</Label>
                    <Input 
                      type="email"
                      value={settings.smtp_from_email}
                      onChange={e => setSettings({ ...settings, smtp_from_email: e.target.value })}
                      placeholder="orders@yourbrand.com"
                      className="h-11 bg-secondary/20 border-border/70 text-[14px] rounded-[12px] px-4"
                      disabled={!settings.smtp_enabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">From Name</Label>
                    <Input 
                      value={settings.smtp_from_name}
                      onChange={e => setSettings({ ...settings, smtp_from_name: e.target.value })}
                      placeholder="Your Store Name"
                      className="h-11 bg-secondary/20 border-border/70 text-[14px] rounded-[12px] px-4"
                      disabled={!settings.smtp_enabled}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <Send className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Test Configuration</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Verify your settings with a test email.</CardDescription>
                  </div>
                </div>
                {testResult === 'success' && (
                  <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 text-[10px] font-bold border-emerald-500/20 rounded-full px-2.5">
                    <CheckCircle2 className="w-3 h-3 mr-1.5" /> Working
                  </Badge>
                )}
                {testResult === 'error' && (
                  <Badge variant="outline" className="bg-red-500/5 text-red-500 text-[10px] font-bold border-red-500/20 rounded-full px-2.5">
                    <XCircle className="w-3 h-3 mr-1.5" /> Failed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 space-y-2 w-full">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Test Recipient Address</Label>
                  <Input 
                    type="email"
                    value={testEmailAddress}
                    onChange={e => setTestEmailAddress(e.target.value)}
                    placeholder="your@email.com"
                    className="h-11 bg-secondary/20 border-border/70 text-[14px] rounded-[12px] px-4"
                    disabled={!settings.smtp_enabled}
                  />
                </div>
                <Button 
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testing || !settings.smtp_enabled || !settings.smtp_host || !testEmailAddress}
                  className="h-11 px-6 border-border/70 bg-secondary/10 hover:bg-secondary/20 rounded-[12px] text-[11px] font-bold uppercase tracking-wider min-w-[160px]"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70 bg-secondary/10 rounded-[24px] overflow-hidden border-dashed">
            <CardHeader className="px-6 py-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-foreground/70" />
                <CardTitle className="text-[13px] font-bold uppercase tracking-wider text-foreground/70">Setup Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="p-4 rounded-[16px] bg-background/50 border border-border/50 flex flex-col gap-2 shadow-sm">
                <span className="text-[12px] font-bold text-foreground/80">Transactional Emails</span>
                <p className="text-[11.5px] text-muted-foreground font-medium leading-relaxed">
                  Required for order confirmations, shipping updates, and abandoned cart recovery notifications.
                </p>
              </div>
              
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">Common Providers</p>
                <div className="grid gap-2.5">
                  <SmtpProvider 
                    name="Gmail"
                    host="smtp.gmail.com"
                    port={587}
                    note="Use App Password"
                  />
                  <SmtpProvider 
                    name="SendGrid"
                    host="smtp.sendgrid.net"
                    port={587}
                    note="Use API Key"
                  />
                  <SmtpProvider 
                    name="Resend"
                    host="smtp.resend.com"
                    port={587}
                    note="Standard SMTP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SmtpProvider({ name, host, port, note }: { name: string; host: string; port: number; note: string }) {
  return (
    <div className="p-4 bg-background/50 rounded-[16px] border border-border/50 shadow-sm flex items-center justify-between group hover:border-foreground/20 transition-all">
      <div>
        <h5 className="text-[12px] font-bold text-foreground/90">{name}</h5>
        <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{host}:{port}</p>
      </div>
      <Badge variant="secondary" className="bg-secondary/40 text-[9px] font-bold px-1.5 py-0.5 rounded-md border-none">{note}</Badge>
    </div>
  );
}
