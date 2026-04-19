"use client"

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  MessageSquare,
  ShoppingCart,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Phone,
  Mail,
  ToggleLeft,
  ToggleRight,
  Save,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Tag,
  Timer,
  Bot,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

const DEFAULT_SETTINGS = {
  cart_enabled: true,
  checkout_enabled: true,
  bargaining_enabled: true,
  require_email_verification: true,
  payment_link_expiry_minutes: 30,
  welcome_message: "Hi! 👋 I'm your AI shopping assistant. Ask me about products, prices, or just say what you're looking for!",
  otp_message_template: "Your verification code for {store_name} is: {otp}\n\nThis code expires in 10 minutes.",
  order_confirmation_template: "✅ Order confirmed! Your order #{order_id} has been placed.\n\nTotal: {total}\n\nWe'll notify you when it ships.",
  offline_message: "",
  max_products_per_response: 5,
};

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-[#25D366]' : 'bg-secondary'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-2.5 text-[28px] font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color || 'bg-secondary'}`}>
            <Icon className="h-4 w-4 text-foreground" />
          </div>
        </div>
        {sub && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs leading-4 text-muted-foreground">{sub}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WhatsAppCommercePage() {
  const { loading: merchantLoading } = useMerchant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [connection, setConnection] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/whatsapp/commerce', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
      if (data.stats) setStats(data.stats);
      if (data.recentSessions) setRecentSessions(data.recentSessions);
      if (data.connection) setConnection(data.connection);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/whatsapp/commerce', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Commerce settings saved');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  if (merchantLoading || loading) return <MerchantPageSkeleton />;

  const isConnected = connection?.status === 'connected';

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">WhatsApp Storefront</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Configure how your AI agent handles shopping, checkout, and customer sessions on WhatsApp.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-10 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-[0_12px_30px_rgba(37,211,102,0.15)] px-6 rounded-2xl font-semibold transition-all active:scale-95 shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {!isConnected && (
        <div className="mb-8 p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-600">WhatsApp not connected</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Settings will be applied once you{' '}
              <Link href="/settings/whatsapp" className="text-yellow-600 font-medium underline underline-offset-4 hover:text-yellow-700 transition-colors">connect your WhatsApp account</Link>.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Users} label="Total Sessions" value={stats.totalSessions} sub="all time" color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={ShieldCheck} label="Verified" value={stats.authenticatedSessions} sub="email confirmed" color="bg-[#25D366]/10 text-[#25D366]" />
          <StatCard icon={ShoppingCart} label="Active Carts" value={stats.sessionsWithCart} sub="items in cart" color="bg-purple-500/10 text-purple-400" />
          <StatCard icon={Clock} label="Active Today" value={stats.activeSessions} sub="last 24h" color="bg-orange-500/10 text-orange-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Settings */}
        <div className="lg:col-span-2 space-y-6">

          {/* Feature Toggles */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                  <Sparkles className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Commerce Features</CardTitle>
                  <CardDescription className="mt-1 text-sm text-muted-foreground">Enable or disable capabilities for your AI agent</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/70">
              {[
                { key: 'cart_enabled', icon: ShoppingCart, label: 'Shopping Cart', desc: 'Customers can add products and manage a cart during the conversation' },
                { key: 'checkout_enabled', icon: Tag, label: 'Checkout & Payment Links', desc: 'AI generates Stripe payment links and guides customers through checkout' },
                { key: 'bargaining_enabled', icon: TrendingUp, label: 'AI Bargaining', desc: 'Allow the AI to negotiate prices within your configured rules' },
                { key: 'require_email_verification', icon: ShieldCheck, label: 'Require Email Verification', desc: 'Customers must verify their email via OTP before checking out' },
              ].map(({ key, icon: Icon, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-5 lg:p-6 transition-colors hover:bg-secondary/25">
                  <div className="flex items-start gap-4 flex-1 pr-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary mt-0.5 shrink-0">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </div>
                  <Toggle enabled={(settings as any)[key]} onChange={(v) => set(key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Behavior */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                  <Bot className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">AI Behavior</CardTitle>
                  <CardDescription className="mt-1 text-sm text-muted-foreground">Control how the AI responds and presents products</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-8 lg:p-6">
              <div className="space-y-4">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Max Products Per Response</label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {[1, 3, 5, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => set('max_products_per_response', n)}
                      className={`h-11 w-14 rounded-xl text-sm font-semibold transition-all border ${
                        settings.max_products_per_response === n
                          ? 'bg-secondary text-foreground border-border/70 shadow-sm'
                          : 'border-border/70 text-muted-foreground hover:bg-secondary/45 hover:text-foreground'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">Number of product cards sent per AI reply</p>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5" />
                  Payment Link Expiry
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.payment_link_expiry_minutes}
                    onChange={e => set('payment_link_expiry_minutes', parseInt(e.target.value) || 30)}
                    className="w-28 rounded-xl border-border/70 bg-secondary/25 px-4 h-11 text-sm font-semibold focus:ring-1 focus:ring-border/70"
                  />
                  <span className="text-sm text-muted-foreground font-medium">minutes</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">How long Stripe payment links remain valid</p>
              </div>
            </CardContent>
          </Card>

          {/* Message Templates */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                  <MessageSquare className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Message Templates</CardTitle>
                  <CardDescription className="mt-1 text-sm text-muted-foreground">Customize automated messages sent to customers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6 lg:p-6">
              <div className="space-y-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Welcome Message</label>
                <Textarea
                  value={settings.welcome_message}
                  onChange={e => set('welcome_message', e.target.value)}
                  rows={3}
                  className="rounded-xl border-border/70 bg-secondary/25 px-4 py-3 text-sm font-medium resize-none focus:ring-1 focus:ring-border/70"
                  placeholder="Greeting shown to new customers..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  OTP Verification Message
                  <span className="ml-2 text-muted-foreground/50 font-normal normal-case tracking-normal">vars: {'{store_name}'}, {'{otp}'}</span>
                </label>
                <Textarea
                  value={settings.otp_message_template}
                  onChange={e => set('otp_message_template', e.target.value)}
                  rows={3}
                  className="rounded-xl border-border/70 bg-secondary/25 px-4 py-3 text-sm font-medium resize-none focus:ring-1 focus:ring-border/70"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Order Confirmation
                  <span className="ml-2 text-muted-foreground/50 font-normal normal-case tracking-normal">vars: {'{order_id}'}, {'{total}'}</span>
                </label>
                <Textarea
                  value={settings.order_confirmation_template}
                  onChange={e => set('order_confirmation_template', e.target.value)}
                  rows={4}
                  className="rounded-xl border-border/70 bg-secondary/25 px-4 py-3 text-sm font-medium resize-none focus:ring-1 focus:ring-border/70"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Offline Auto-Reply
                  <span className="ml-2 text-muted-foreground/50 font-normal normal-case tracking-normal">leave blank to disable</span>
                </label>
                <Textarea
                  value={settings.offline_message}
                  onChange={e => set('offline_message', e.target.value)}
                  rows={2}
                  className="rounded-xl border-border/70 bg-secondary/25 px-4 py-3 text-sm font-medium resize-none focus:ring-1 focus:ring-border/70"
                  placeholder="We're away right now, we'll get back to you soon..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Sessions */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight">Live Sessions</CardTitle>
                  <CardDescription className="mt-1 text-xs text-muted-foreground">Recent customer conversations</CardDescription>
                </div>
                <Badge variant="secondary" className="rounded-full border border-border/70 bg-secondary px-2 py-0.5 text-[10px]">
                  Last 20
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-secondary">
                    <MessageSquare className="h-5 w-5 text-foreground" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">No sessions yet</p>
                  <p className="mt-2 text-xs text-muted-foreground">Sessions appear once customers message you</p>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="px-5 py-4 hover:bg-secondary/25 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary shrink-0">
                            <Phone className="h-4 w-4 text-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              +{session.phone_number}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {session.email_verified && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#25D366]">
                                  <Mail className="h-3 w-3" /> Verified
                                </span>
                              )}
                              {session.cart_items > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-400">
                                  <ShoppingCart className="h-3 w-3" /> {session.cart_items} item{session.cart_items !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {session.cart_value > 0 && (
                            <p className="text-sm font-semibold tracking-tight text-foreground">
                              ${session.cart_value.toFixed(2)}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(session.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 px-4 py-3.5">
              <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground uppercase tracking-[0.18em]">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1">
              {[
                { href: '/settings/whatsapp', label: 'Connection & QR Code', icon: MessageSquare },
                { href: '/marketing/whatsapp', label: 'Broadcast Campaigns', icon: TrendingUp },
                { href: '/conversations', label: 'All Conversations', icon: Users },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/45 transition-colors group">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-background transition-colors">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
