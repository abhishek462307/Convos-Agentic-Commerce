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
        enabled ? 'bg-[#25D366]' : 'bg-secondary/25'
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
    <div className="p-5 rounded-2xl border border-border bg-secondary/25 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-black text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
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
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans">
      <div className="mb-8">
        <Button variant="ghost" asChild className="p-0 hover:bg-secondary/30 text-muted-foreground hover:text-foreground h-auto transition-all">
          <Link href="/settings/whatsapp" className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">WhatsApp Settings</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold border-border/70 bg-secondary/20 text-foreground">
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">WhatsApp Commerce</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Commerce Control</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1.5">
            Configure how your AI agent handles shopping, checkout, and customer sessions on WhatsApp.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-11 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg shadow-[#25D366]/20 px-8 rounded-xl font-bold transition-all active:scale-95 shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {!isConnected && (
        <div className="mb-8 p-5 rounded-2xl border border-yellow-500/20 bg-yellow-400/5 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-500">WhatsApp not connected</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Settings will be applied once you{' '}
              <Link href="/settings/whatsapp" className="text-yellow-400 underline underline-offset-2">connect your WhatsApp account</Link>.
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
          <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-white/5 py-6 px-6 bg-secondary/25">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#25D366]" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight">Commerce Features</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-medium mt-0.5">Enable or disable capabilities for your AI agent</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-0 divide-y divide-border">
              {[
                { key: 'cart_enabled', icon: ShoppingCart, label: 'Shopping Cart', desc: 'Customers can add products and manage a cart during the conversation' },
                { key: 'checkout_enabled', icon: Tag, label: 'Checkout & Payment Links', desc: 'AI generates Stripe payment links and guides customers through checkout' },
                { key: 'bargaining_enabled', icon: TrendingUp, label: 'AI Bargaining', desc: 'Allow the AI to negotiate prices within your configured rules' },
                { key: 'require_email_verification', icon: ShieldCheck, label: 'Require Email Verification', desc: 'Customers must verify their email via OTP before checking out' },
              ].map(({ key, icon: Icon, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3 flex-1 pr-6">
                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-foreground">{label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                  <Toggle enabled={(settings as any)[key]} onChange={(v) => set(key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Behavior */}
          <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-white/5 py-6 px-6 bg-secondary/25">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight">AI Behavior</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-medium mt-0.5">Control how the AI responds and presents products</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Max Products Per Response</label>
                <div className="flex items-center gap-4">
                  {[1, 3, 5, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => set('max_products_per_response', n)}
                      className={`w-12 h-10 rounded-xl text-sm font-bold transition-all border ${
                        settings.max_products_per_response === n
                          ? 'bg-foreground text-background border-foreground shadow-sm'
                          : 'border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground bg-secondary/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Number of product cards sent per AI reply</p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Timer className="w-3.5 h-3.5" />
                  Payment Link Expiry
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.payment_link_expiry_minutes}
                    onChange={e => set('payment_link_expiry_minutes', parseInt(e.target.value) || 30)}
                    className="w-28 bg-secondary/20 border-border text-foreground font-bold"
                  />
                  <span className="text-sm text-muted-foreground font-medium">minutes</span>
                </div>
                <p className="text-[11px] text-muted-foreground">How long Stripe payment links remain valid</p>
              </div>
            </CardContent>
          </Card>

          {/* Message Templates */}
          <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-white/5 py-6 px-6 bg-secondary/25">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight">Message Templates</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-medium mt-0.5">Customize automated messages sent to customers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Welcome Message</label>
                <Textarea
                  value={settings.welcome_message}
                  onChange={e => set('welcome_message', e.target.value)}
                  rows={3}
                  className="bg-secondary/20 border-border text-foreground text-sm font-medium resize-none"
                  placeholder="Greeting shown to new customers..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  OTP Verification Message
                  <span className="ml-2 text-muted-foreground/40 font-normal normal-case tracking-normal">vars: {'{store_name}'}, {'{otp}'}</span>
                </label>
                <Textarea
                  value={settings.otp_message_template}
                  onChange={e => set('otp_message_template', e.target.value)}
                  rows={3}
                  className="bg-secondary/20 border-border text-foreground text-sm font-medium resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Order Confirmation
                  <span className="ml-2 text-muted-foreground/40 font-normal normal-case tracking-normal">vars: {'{order_id}'}, {'{total}'}</span>
                </label>
                <Textarea
                  value={settings.order_confirmation_template}
                  onChange={e => set('order_confirmation_template', e.target.value)}
                  rows={4}
                  className="bg-secondary/20 border-border text-foreground text-sm font-medium resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Offline Auto-Reply
                  <span className="ml-2 text-muted-foreground/40 font-normal normal-case tracking-normal">leave blank to disable</span>
                </label>
                <Textarea
                  value={settings.offline_message}
                  onChange={e => set('offline_message', e.target.value)}
                  rows={2}
                  className="bg-secondary/20 border-border text-foreground text-sm font-medium resize-none"
                  placeholder="We're away right now, we'll get back to you soon..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Sessions */}
        <div className="space-y-6">
          <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-white/5 py-5 px-5 bg-secondary/25">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold tracking-tight">Live Sessions</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground font-medium mt-0.5">Recent customer conversations</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold border-border bg-secondary/20">
                  Last 20
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentSessions.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground font-medium">No sessions yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Sessions appear once customers message you</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="px-5 py-4 hover:bg-secondary/25 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-secondary/20 border border-border flex items-center justify-center shrink-0">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              +{session.phone_number}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {session.email_verified && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#25D366]">
                                  <Mail className="w-2.5 h-2.5" /> Verified
                                </span>
                              )}
                              {session.cart_items > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400">
                                  <ShoppingCart className="w-2.5 h-2.5" /> {session.cart_items} item{session.cart_items !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {session.cart_value > 0 && (
                            <p className="text-xs font-black text-foreground">
                              ${session.cart_value.toFixed(2)}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
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
          <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-3">Quick Links</p>
              {[
                { href: '/settings/whatsapp', label: 'Connection & QR Code', icon: MessageSquare },
                { href: '/marketing/whatsapp', label: 'Broadcast Campaigns', icon: TrendingUp },
                { href: '/conversations', label: 'All Conversations', icon: Users },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors group">
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
