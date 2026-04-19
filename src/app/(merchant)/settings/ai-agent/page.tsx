"use client";

import React, { useState, useEffect } from "react";
import { 
  Bot, 
  ShieldCheck, 
  Zap, 
  ShieldAlert,
  Save,
  Loader2,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMerchant } from "@/hooks/use-merchant";
import { toast } from "sonner";
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

export default function AIAgentSettings() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [enabled, setEnabled] = useState(false);
  const [missionVisibility, setMissionVisibility] = useState(true);
  const [maxDiscount, setMaxDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (merchant) {
      setEnabled(merchant.ai_auto_negotiation_enabled ?? false);
      setMissionVisibility(merchant.ai_mission_visibility_enabled ?? true);
      setMaxDiscount(merchant.ai_max_discount_percentage || 0);
    }
  }, [merchant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/merchant/settings/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            ai_auto_negotiation_enabled: enabled,
            ai_mission_visibility_enabled: missionVisibility,
            ai_max_discount_percentage: maxDiscount,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to save delegation rules');
      refetch();
      toast.success("Delegation rules saved");
    } catch (error) {
      toast.error("Failed to save delegation rules");
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading) return <MerchantPageSkeleton />;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 lg:px-8">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Autonomous Strategy</span>
        </div>
        <h1 className="text-lg font-bold tracking-tight">Agent Delegation</h1>
        <p className="text-muted-foreground text-sm mt-2">Delegate negotiation and closing power to your AI agent.</p>
      </div>

      <div className="grid gap-8">
        <Card className="border-border bg-white/[0.01]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Autonomous Negotiation</CardTitle>
                <CardDescription className="text-xs">Allow the AI to close deals without manual approval.</CardDescription>
              </div>
              <Switch 
                checked={enabled} 
                onCheckedChange={setEnabled}
                className="data-[state=checked]:bg-white"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-secondary/20 border border-white/10 flex gap-4">
              <Info className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, your AI agent will automatically act within your safety bounds. 
                The agent will use its sales persona to close deals, bargain with customers, and apply discounts up to your specified limit.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">Max Autonomous Discount</label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Input 
                      type="number" 
                      value={maxDiscount} 
                      onChange={(e) => setMaxDiscount(Number(e.target.value))}
                      className="pr-8 bg-background border-border"
                      max={50}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                  <Badge variant="outline" className="h-10 px-4 bg-background">
                    Floor Price: {100 - maxDiscount}% of MSRP
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">The agent will never offer a price lower than this percentage.</p>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <label className="text-xs font-medium text-muted-foreground">Trust Guardrails</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-background flex flex-col gap-2">
                      <ShieldCheck className="w-4 h-4 text-foreground" />
                      <span className="text-xs font-bold">High Trust Shoppers (Score {'>'} 80)</span>
                      <p className="text-[10px] text-muted-foreground">AI can use full discount limit to close deals instantly.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-background flex flex-col gap-2">
                      <ShieldAlert className="w-4 h-4 text-foreground" />
                      <span className="text-xs font-bold">Low Trust Shoppers (Score {'<'} 40)</span>
                      <p className="text-[10px] text-muted-foreground">AI will require manual approval regardless of settings.</p>
                    </div>
                </div>
              </div>
            </div>

              <div className="pt-4">
                <Button 
                  className="w-full bg-white text-black hover:bg-white/90 font-bold"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Delegation Rules
                </Button>
              </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-white/[0.01]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Predictive Assistant Visibility</CardTitle>
                <CardDescription className="text-xs">Show active AI assistance to visitors on the storefront.</CardDescription>
              </div>
              <Switch 
                checked={missionVisibility} 
                onCheckedChange={setMissionVisibility}
                className="data-[state=checked]:bg-white"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl bg-secondary/20 border border-white/10 flex gap-4">
              <Zap className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, the AI will proactively display an assistant status card at the top of the storefront for returning visitors. 
                This builds trust by showing the autonomous work (price watching, stock alerts) the agent is doing in the background.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border border-dashed bg-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-foreground" />
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Autonomous Nudges</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              When enabled, the AI will proactively "nudge" customers via email or notification if it has a deal for them.
            </p>
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
              <div className="flex flex-col">
                <span className="text-xs font-bold">Enable Proactive Re-engagement</span>
                <span className="text-[10px] text-muted-foreground">Agent follows up on incomplete missions.</span>
              </div>
              <Switch checked={true} disabled />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
