"use client"

import React, { useEffect, useState } from 'react';
import {
  Zap,
  Package,
  ShoppingCart,
  Boxes,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';
import { DEFAULT_AGENTIC_TRIGGER_SETTINGS } from '@/lib/agentic/trigger-config';
import type { AgenticTriggerSettings, Merchant } from '@/types';

type AutomationMerchantState = Merchant & {
  notification_settings: Record<string, unknown>
}

function normalizeTriggerSettings(raw: unknown): AgenticTriggerSettings {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};

  const readRule = (key: keyof AgenticTriggerSettings) => {
    const current = source[key];
    const rule = current && typeof current === 'object' && !Array.isArray(current)
      ? current as Record<string, unknown>
      : {};

    return {
      enabled: typeof rule.enabled === 'boolean' ? rule.enabled : DEFAULT_AGENTIC_TRIGGER_SETTINGS[key].enabled,
      cooldownHours: Number.isFinite(Number(rule.cooldownHours))
        ? Math.max(1, Number(rule.cooldownHours))
        : DEFAULT_AGENTIC_TRIGGER_SETTINGS[key].cooldownHours,
      minCount: Number.isFinite(Number(rule.minCount))
        ? Math.max(1, Number(rule.minCount))
        : DEFAULT_AGENTIC_TRIGGER_SETTINGS[key].minCount,
    };
  };

  return {
    abandonedCartRecovery: readRule('abandonedCartRecovery'),
    lowStockRisk: readRule('lowStockRisk'),
    deadInventoryCleanup: readRule('deadInventoryCleanup'),
  };
}

export default function AutomationSettingsPage() {
  const { merchant: merchantContext, loading: merchantLoading, refetch } = useMerchant();
  const [merchant, setMerchant] = useState<AutomationMerchantState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!merchantContext) return;
    const notificationSettings = merchantContext.notification_settings && typeof merchantContext.notification_settings === 'object'
      ? merchantContext.notification_settings
      : {};

    setMerchant({
      ...merchantContext,
      store_email: merchantContext.store_email || '',
      ai_responses_enabled: merchantContext.ai_responses_enabled ?? true,
      conversation_logging_enabled: merchantContext.conversation_logging_enabled ?? true,
      abandoned_cart_recovery_enabled: merchantContext.abandoned_cart_recovery_enabled ?? false,
      low_stock_alerts_enabled: merchantContext.low_stock_alerts_enabled ?? true,
      low_stock_threshold: merchantContext.low_stock_threshold ?? 10,
      order_notification_email: merchantContext.order_notification_email || '',
      notification_settings: {
        ...notificationSettings,
        agentic_triggers: normalizeTriggerSettings(
          (notificationSettings as Record<string, unknown>).agentic_triggers
        ),
      },
    });
  }, [merchantContext]);

  const triggerSettings = normalizeTriggerSettings(merchant?.notification_settings?.agentic_triggers);

  const updateTriggerRule = (
    key: keyof AgenticTriggerSettings,
    field: keyof AgenticTriggerSettings[keyof AgenticTriggerSettings],
    value: boolean | number
  ) => {
    if (!merchant) return;

    setMerchant({
      ...merchant,
      notification_settings: {
        ...merchant.notification_settings,
        agentic_triggers: {
          ...triggerSettings,
          [key]: {
            ...triggerSettings[key],
            [field]: typeof value === 'number' ? Math.max(1, value) : value,
          },
        },
      },
    });
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
            ai_responses_enabled: merchant.ai_responses_enabled,
            conversation_logging_enabled: merchant.conversation_logging_enabled,
            abandoned_cart_recovery_enabled: merchant.abandoned_cart_recovery_enabled,
            low_stock_alerts_enabled: merchant.low_stock_alerts_enabled,
            low_stock_threshold: merchant.low_stock_threshold,
            order_notification_email: merchant.order_notification_email,
            notification_settings: {
              ...merchant.notification_settings,
              agentic_triggers: triggerSettings,
            },
          },
          mergeKeys: ['notification_settings'],
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to save');
      refetch();
      toast.success("Automation settings saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading || !merchant) return <MerchantPageSkeleton />;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Operations</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Autonomous Workflows</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Automation</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Manage AI responses, logging, alerts, and autonomous mission triggers from a calm control surface.</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Preferences and Inventory */}
          <div className="space-y-6 flex flex-col">
            {/* Preferences Card */}
            <Card className="rounded-[24px] border-border/70 bg-card overflow-hidden shadow-sm flex-1">
              <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <Zap className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">AI Preferences</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Control how AI interacts with your customers.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[15px] font-semibold text-foreground">AI Auto-Responses</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">Automatically answer customer questions 24/7 with human-like intelligence.</p>
                  </div>
                  <Switch
                    checked={merchant?.ai_responses_enabled}
                    onCheckedChange={(val) => setMerchant({ ...merchant, ai_responses_enabled: val })}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-foreground">Save Chat History</p>
                      <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/20 text-emerald-600 bg-emerald-500/5 rounded-full px-2 uppercase tracking-tighter">Intelligence</Badge>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">Record all AI conversations to improve planning and product recommendations.</p>
                  </div>
                  <Switch
                    checked={merchant?.conversation_logging_enabled}
                    onCheckedChange={(val) => setMerchant({ ...merchant, conversation_logging_enabled: val })}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
  
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[15px] font-semibold text-foreground">Abandoned Cart Recovery</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">Proactively reach out to customers who left items in their cart.</p>
                  </div>
                  <Switch
                    checked={merchant?.abandoned_cart_recovery_enabled}
                    onCheckedChange={(val) => setMerchant({ ...merchant, abandoned_cart_recovery_enabled: val })}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>
  
            {/* Inventory Card */}
            <Card className="rounded-[24px] border-border/70 bg-card overflow-hidden shadow-sm">
              <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <Package className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Inventory & Notifications</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Keep your team informed about stock levels.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[15px] font-semibold text-foreground">Low Stock Alerts</p>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">Notify your team when stock levels fall below a specific threshold.</p>
                  </div>
                  <Switch
                    checked={merchant?.low_stock_alerts_enabled}
                    onCheckedChange={(val) => setMerchant({ ...merchant, low_stock_alerts_enabled: val })}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
  
                <AnimatePresence>
                  {merchant?.low_stock_alerts_enabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 bg-secondary/20 rounded-[20px] border border-border/70 space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="threshold" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Alert Threshold</Label>
                          <div className="flex items-center gap-3">
                            <Input
                              id="threshold"
                              type="number"
                              min="1"
                              value={merchant?.low_stock_threshold || 10}
                              onChange={(e) => setMerchant({ ...merchant, low_stock_threshold: parseInt(e.target.value) || 10 })}
                              className="h-10 w-24 bg-background border-border/70 text-[14.5px] font-bold text-center rounded-[12px] px-4"
                            />
                            <span className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-[0.12em]">units</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
  
                <div className="space-y-2">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Notification Email</Label>
                  <Input
                    type="email"
                    placeholder="alerts@domain.com"
                    value={merchant?.order_notification_email || ''}
                    onChange={(e) => setMerchant({ ...merchant, order_notification_email: e.target.value })}
                    className="h-11 bg-secondary/20 border-border/70 text-[14.5px] font-medium rounded-[12px] px-4"
                  />
                  <p className="text-[11px] text-muted-foreground/60 font-bold uppercase tracking-[0.12em] italic px-0.5">Fallback: {merchant?.store_email}</p>
                </div>
              </CardContent>
            </Card>
          </div>
  
          {/* Right Column: Agentic Triggers */}
          <Card className="rounded-[24px] border-border/70 bg-card overflow-hidden shadow-sm flex flex-col">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Sparkles className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Agentic Triggers</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Configure when AI agents should autonomously act.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 flex-1 overflow-auto scrollbar-none">
              {[
                { id: 'abandonedCartRecovery', label: 'Abandoned Cart Recovery', icon: ShoppingCart, desc: 'Detect stalled checkouts and engage customers with incentives.' },
                { id: 'lowStockRisk', label: 'Low Stock Protection', icon: Package, desc: 'Identify critical inventory risks and propose restock actions.' },
                { id: 'deadInventoryCleanup', label: 'Inventory Liquidation', icon: Boxes, desc: 'Detect slow-moving items and initiate automated campaigns.' }
              ].map((trigger) => {
                const settings = triggerSettings[trigger.id as keyof AgenticTriggerSettings];
                return (
                  <div key={trigger.id} className="rounded-[20px] border border-border/70 bg-secondary/20 p-5 space-y-4 hover:border-border transition-all group shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-background border border-border/70 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                          <trigger.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[15px] font-semibold text-foreground tracking-tight">{trigger.label}</p>
                          <p className="text-[12.5px] leading-tight text-muted-foreground/85">{trigger.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.enabled}
                        onCheckedChange={(val) => updateTriggerRule(trigger.id as keyof AgenticTriggerSettings, 'enabled', val)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
  
                    <AnimatePresence>
                      {settings.enabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-2 gap-4 pt-2"
                        >
                          <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em] px-0.5">Min Events</Label>
                            <Input
                              type="number"
                              min="1"
                              value={settings.minCount}
                              onChange={(e) => updateTriggerRule(trigger.id as keyof AgenticTriggerSettings, 'minCount', parseInt(e.target.value, 10) || 1)}
                              className="h-10 bg-background border-border/70 text-[14px] font-bold rounded-[12px] px-4"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em] px-0.5">Cooldown (h)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={settings.cooldownHours}
                              onChange={(e) => updateTriggerRule(trigger.id as keyof AgenticTriggerSettings, 'cooldownHours', parseInt(e.target.value, 10) || 1)}
                              className="h-10 bg-background border-border/70 text-[14px] font-bold rounded-[12px] px-4"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              
              <div className="p-5 bg-emerald-500/5 rounded-[20px] border border-emerald-500/10 flex items-start gap-4 mt-2 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[13px] leading-relaxed text-muted-foreground/85">
                  <span className="font-bold text-foreground">Agentic Intelligence:</span> Triggers use high-confidence thresholds to ensure agents only act when a clear commerce objective is present.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
}
