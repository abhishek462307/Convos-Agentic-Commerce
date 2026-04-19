"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Bell,
  Mail,
  Smartphone,
  ShoppingCart,
  Package,
  MessageSquare,
  Users,
  AlertTriangle,
  DollarSign,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

const EMAIL_NOTIFICATIONS = [
  { 
    key: 'new_order', 
    label: 'New orders', 
    description: 'Get notified when a new order is placed',
    icon: ShoppingCart,
    category: 'orders'
  },
  { 
    key: 'order_fulfilled', 
    label: 'Order fulfilled', 
    description: 'When an order is marked as fulfilled',
    icon: Package,
    category: 'orders'
  },
  { 
    key: 'order_cancelled', 
    label: 'Order cancelled', 
    description: 'When a customer cancels an order',
    icon: AlertTriangle,
    category: 'orders'
  },
  { 
    key: 'new_customer', 
    label: 'New customer signup', 
    description: 'When a new customer creates an account',
    icon: Users,
    category: 'customers'
  },
  { 
    key: 'new_review', 
    label: 'New product review', 
    description: 'When a customer leaves a review',
    icon: MessageSquare,
    category: 'customers'
  },
  { 
    key: 'low_stock', 
    label: 'Low stock alerts', 
    description: 'When a product falls below stock threshold',
    icon: AlertTriangle,
    category: 'inventory'
  },
  { 
    key: 'payout_sent', 
    label: 'Payout sent', 
    description: 'When a payout is processed to your account',
    icon: DollarSign,
    category: 'payments'
  },
];

const PUSH_NOTIFICATIONS = [
  { key: 'push_orders', label: 'Order updates', description: 'New orders and status changes' },
  { key: 'push_customers', label: 'Customer activity', description: 'New signups and messages' },
  { key: 'push_inventory', label: 'Inventory alerts', description: 'Low stock and out of stock' },
  { key: 'push_marketing', label: 'Marketing tips', description: 'Tips to grow your store' },
];

export default function NotificationsPage() {
  const { merchant, refetch, loading: merchantLoading } = useMerchant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_notifications_enabled: true,
    push_notifications_enabled: false,
    new_order: true,
    order_fulfilled: false,
    order_cancelled: true,
    new_customer: false,
    new_review: true,
    low_stock: true,
    payout_sent: true,
    push_orders: true,
    push_customers: false,
    push_inventory: true,
    push_marketing: false,
    daily_digest: false,
    weekly_report: true,
  });

  useEffect(() => {
    if (merchant) {
      const notificationSettings = merchant.notification_settings || {};
      setSettings(prev => ({
        ...prev,
        ...notificationSettings
      }));
      setLoading(false);
    }
  }, [merchant]);

  const handleToggle = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

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
            notification_settings: {
              ...(merchant.notification_settings || {}),
              ...settings,
            },
          },
          mergeKeys: ['notification_settings'],
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to save settings');
      toast.success('Notification preferences saved');
      refetch?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    }
    setSaving(false);
  };

  if (merchantLoading || loading) {
    return <MerchantPageSkeleton />;
  }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Preferences</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">System Alerts</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Notifications</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Choose how and when you want to be notified from a calm control surface.</p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
  
      <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
        <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                <Mail className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold tracking-tight">Email Notifications</CardTitle>
                <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">
                  Sent to {merchant?.store_email || 'your email'}
                </CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.email_notifications_enabled}
                onCheckedChange={(val) => handleToggle('email_notifications_enabled', val)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardHeader>
            {settings.email_notifications_enabled && (
              <CardContent className="p-0">
                <div className="px-6 py-4 border-b border-border/70 bg-emerald-500/[0.03] flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Custom SMTP Configuration</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 font-medium leading-tight">Send emails from your own domain.</p>
                  </div>
                  <Link href="/settings/email">
                    <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/70 text-[10px] font-bold uppercase tracking-wider">
                      Configure SMTP <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
                <div className="px-6 py-2.5 border-b border-border/70 bg-secondary/20">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Orders</p>
                </div>
              {EMAIL_NOTIFICATIONS.filter(n => n.category === 'orders').map((notification) => (
                <div key={notification.key} className="flex items-center justify-between px-6 py-4 border-b border-border/70 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-background border border-border/70 flex items-center justify-center">
                      <notification.icon className="w-4 h-4 text-muted-foreground/80" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-foreground tracking-tight">{notification.label}</p>
                      <p className="text-[12.5px] leading-relaxed text-muted-foreground mt-0.5">{notification.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings[notification.key as keyof typeof settings] as boolean}
                    onCheckedChange={(val) => handleToggle(notification.key, val)}
                    className="data-[state=checked]:bg-emerald-500 scale-90"
                  />
                </div>
              ))}
  
              <div className="px-6 py-2.5 border-b border-border/70 bg-secondary/20">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Customers</p>
              </div>
              {EMAIL_NOTIFICATIONS.filter(n => n.category === 'customers').map((notification) => (
                <div key={notification.key} className="flex items-center justify-between px-6 py-4 border-b border-border/70 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-background border border-border/70 flex items-center justify-center">
                      <notification.icon className="w-4 h-4 text-muted-foreground/80" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-foreground tracking-tight">{notification.label}</p>
                      <p className="text-[12.5px] leading-relaxed text-muted-foreground mt-0.5">{notification.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings[notification.key as keyof typeof settings] as boolean}
                    onCheckedChange={(val) => handleToggle(notification.key, val)}
                    className="data-[state=checked]:bg-emerald-500 scale-90"
                  />
                </div>
              ))}
  
              <div className="px-6 py-2.5 border-b border-border/70 bg-secondary/20">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Inventory & Payments</p>
              </div>
              {EMAIL_NOTIFICATIONS.filter(n => n.category === 'inventory' || n.category === 'payments').map((notification, idx, arr) => (
                <div key={notification.key} className={`flex items-center justify-between px-6 py-4 border-border/70 hover:bg-secondary/20 transition-colors ${idx === arr.length - 1 ? '' : 'border-b'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-background border border-border/70 flex items-center justify-center">
                      <notification.icon className="w-4 h-4 text-muted-foreground/80" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-foreground tracking-tight">{notification.label}</p>
                      <p className="text-[12.5px] leading-relaxed text-muted-foreground mt-0.5">{notification.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings[notification.key as keyof typeof settings] as boolean}
                    onCheckedChange={(val) => handleToggle(notification.key, val)}
                    className="data-[state=checked]:bg-emerald-500 scale-90"
                  />
                </div>
              ))}
            </CardContent>
          )}
        </Card>
  
      <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
        <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                <Smartphone className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold tracking-tight">Push Notifications</CardTitle>
                <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">
                  Receive alerts on your browser or mobile device
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.push_notifications_enabled}
              onCheckedChange={(val) => handleToggle('push_notifications_enabled', val)}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PUSH_NOTIFICATIONS.map((notification) => (
                <div key={notification.key} className={`flex items-center justify-between p-4 bg-secondary/20 rounded-[16px] border border-border/70 ${!settings.push_notifications_enabled ? 'opacity-50 pointer-events-none' : 'hover:border-border transition-all shadow-sm'}`}>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{notification.label}</p>
                    <p className="text-[11.5px] text-muted-foreground font-medium mt-0.5">{notification.description}</p>
                  </div>
                  <Switch
                    checked={settings[notification.key as keyof typeof settings] as boolean}
                    onCheckedChange={(val) => handleToggle(notification.key, val)}
                    className="scale-75 data-[state=checked]:bg-emerald-500"
                    disabled={!settings.push_notifications_enabled}
                  />
                </div>
              ))}
            </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
        <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
              <Bell className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-[17px] font-semibold tracking-tight">Email Digest</CardTitle>
              <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">
                Summary reports sent to your email
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 hover:bg-secondary/20 transition-colors">
              <div>
                <p className="text-[14px] font-semibold text-foreground">Daily Digest</p>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground mt-0.5">A summary of your store activity every morning</p>
              </div>
              <Switch
                checked={settings.daily_digest}
                onCheckedChange={(val) => handleToggle('daily_digest', val)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors">
              <div>
                <p className="text-[14px] font-semibold text-foreground">Weekly Report</p>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground mt-0.5">Performance summary sent every Monday</p>
              </div>
              <Switch
                checked={settings.weekly_report}
                onCheckedChange={(val) => handleToggle('weekly_report', val)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
