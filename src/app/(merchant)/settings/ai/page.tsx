"use client"

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Bot,
  Zap,
  ChevronRight,
  Loader2,
  Upload,
  X,
  User,
  MessageSquare,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';
import { uploadFile } from '@/lib/storage';

const PERSONA_PRESETS = [
  {
    label: "Friendly Expert",
    persona: "Warm, knowledgeable, and always eager to help. Uses casual language with emojis. Makes customers feel like they're chatting with a friend who happens to be an expert.",
  },
  {
    label: "Luxury Concierge",
    persona: "Refined, elegant, and attentive to detail. Speaks with sophistication and makes every interaction feel exclusive. Addresses customers with respect and provides white-glove service.",
  },
  {
    label: "Energetic Hype Person",
    persona: "High-energy, enthusiastic, and excited about every product. Uses exclamation marks, slang, and hype language. Makes shopping feel like a party.",
  },
  {
    label: "Chill Advisor",
    persona: "Laid-back, honest, and straightforward. No pressure sales tactics. Gives genuine recommendations like a trusted friend would. Uses relaxed, conversational language.",
  },
];

export default function AIIntelligencePage() {
  const { merchant: merchantContext, loading: merchantLoading, refetch } = useMerchant();
  const [merchant, setMerchant] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!merchantContext) return;

    setMerchant({
      ...merchantContext,
      ai_tone: merchantContext.ai_tone || 'friendly',
      ai_negotiation_style: merchantContext.ai_negotiation_style || 'moderate',
      ai_custom_instructions: merchantContext.ai_custom_instructions || '',
      bargain_mode_enabled: merchantContext.bargain_mode_enabled ?? false,
      bargain_ai_personality: merchantContext.bargain_ai_personality || 'friendly',
      ai_auto_negotiation_enabled: merchantContext.ai_auto_negotiation_enabled ?? false,
      ai_mission_visibility_enabled: merchantContext.ai_mission_visibility_enabled ?? true,
      ai_max_discount_percentage: merchantContext.ai_max_discount_percentage || 0,
      ai_character_name: merchantContext.ai_character_name || '',
      ai_character_persona: merchantContext.ai_character_persona || '',
      ai_character_backstory: merchantContext.ai_character_backstory || '',
      ai_character_avatar_url: merchantContext.ai_character_avatar_url || null,
      ai_character_subtitle: merchantContext.branding_settings?.ai_character_subtitle || '',
      exclude_bargained_from_discounts: merchantContext.branding_settings?.exclude_bargained_from_discounts !== false,
    });
  }, [merchantContext]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !merchant) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, "merchant-assets", `characters/${merchant.id}`);
      setMerchant({ ...merchant, ai_character_avatar_url: url });
      toast.success("Avatar uploaded");
    } catch (err) {
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/merchant/settings/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            ai_tone: merchant.ai_tone,
            ai_negotiation_style: merchant.ai_negotiation_style,
            ai_custom_instructions: merchant.ai_custom_instructions,
            bargain_mode_enabled: merchant.bargain_mode_enabled,
            bargain_ai_personality: merchant.bargain_ai_personality,
            ai_auto_negotiation_enabled: merchant.ai_auto_negotiation_enabled,
            ai_mission_visibility_enabled: merchant.ai_mission_visibility_enabled,
            ai_max_discount_percentage: merchant.ai_max_discount_percentage,
            ai_character_name: merchant.ai_character_name || null,
            ai_character_persona: merchant.ai_character_persona || null,
            ai_character_backstory: merchant.ai_character_backstory || null,
            ai_character_avatar_url: merchant.ai_character_avatar_url || null,
            branding_settings: {
              ai_character_subtitle: merchant.ai_character_subtitle || null,
              exclude_bargained_from_discounts: merchant.exclude_bargained_from_discounts,
            },
          },
          mergeKeys: ['branding_settings'],
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save');
      }

      await refetch();
      toast.success("AI settings saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading || !merchant) return <MerchantPageSkeleton />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Intelligence</Badge>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Autonomous Control Surface</span>
          </div>
          <h2 className="text-[28px] font-semibold tracking-tight text-foreground">AI Intelligence</h2>
          <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Configure how your AI assistant thinks, speaks, and negotiates with customers.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save Intelligence
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* AI Identity Section */}
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <User className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">AI Identity</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Define the face and name of your assistant.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="shrink-0 flex flex-col items-center">
                  <div
                    className="relative w-28 h-28 rounded-[24px] border-2 border-dashed border-border bg-secondary/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-foreground/30 transition-all group shadow-inner"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    ) : merchant.ai_character_avatar_url ? (
                      <>
                        <Image
                          src={merchant.ai_character_avatar_url}
                          alt="Character avatar"
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                        <Upload className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  {merchant.ai_character_avatar_url && (
                    <button
                      onClick={() => setMerchant({ ...merchant, ai_character_avatar_url: null })}
                      className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-red-400 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex-1 w-full space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Character Name</Label>
                      <Input
                        value={merchant.ai_character_name}
                        onChange={(e) => setMerchant({ ...merchant, ai_character_name: e.target.value })}
                        placeholder="e.g. Luna, Max, Sage..."
                        className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Subtitle / Tagline</Label>
                      <Input
                        value={merchant.ai_character_subtitle}
                        onChange={(e) => setMerchant({ ...merchant, ai_character_subtitle: e.target.value })}
                        placeholder="e.g. Your personal coffee guide..."
                        className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Backstory / Origin</Label>
                    <textarea
                      value={merchant.ai_character_backstory}
                      onChange={(e) => setMerchant({ ...merchant, ai_character_backstory: e.target.value })}
                      placeholder=" Luna is the head barista at our virtual coffee bar. She knows every origin story..."
                      className="w-full min-h-[80px] p-4 bg-secondary/20 border border-border/70 rounded-[16px] focus:ring-1 focus:ring-emerald-500/20 text-[14px] font-medium transition-all outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Personality & Tone Section */}
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <MessageSquare className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Personality & Tone</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Set how the AI speaks and behaves.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Quick Persona Presets</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PERSONA_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setMerchant({ ...merchant, ai_character_persona: preset.persona })}
                      className={`p-4 rounded-[16px] border text-left transition-all ${
                        merchant.ai_character_persona === preset.persona
                          ? "border-foreground/30 bg-secondary/40 shadow-sm"
                          : "border-border/70 bg-secondary/10 hover:border-border hover:bg-secondary/20"
                      }`}
                    >
                      <span className="text-[13.5px] font-bold block mb-1">{preset.label}</span>
                      <span className="text-[11.5px] text-muted-foreground/80 line-clamp-2 font-medium">
                        {preset.persona}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Custom Persona Description</Label>
                <textarea
                  value={merchant.ai_character_persona}
                  onChange={(e) => setMerchant({ ...merchant, ai_character_persona: e.target.value })}
                  placeholder="Describe how your AI should talk, personality traits, and language style..."
                  className="w-full min-h-[100px] p-4 bg-secondary/20 border border-border/70 rounded-[16px] focus:ring-1 focus:ring-emerald-500/20 text-[14px] font-medium transition-all outline-none resize-none leading-relaxed"
                />
              </div>

              <Separator className="opacity-50" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Brand Tone</Label>
                  <Select
                    value={merchant.ai_tone || 'friendly'}
                    onValueChange={(val) => setMerchant({ ...merchant, ai_tone: val })}
                  >
                    <SelectTrigger className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[16px] border-border/70 bg-popover shadow-xl">
                      <SelectItem value="friendly">Friendly & Welcoming</SelectItem>
                      <SelectItem value="professional">Professional & Precise</SelectItem>
                      <SelectItem value="casual">Casual & Laid-back</SelectItem>
                      <SelectItem value="bold">Bold & Energetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Negotiation Style</Label>
                  <Select
                    value={merchant.ai_negotiation_style || 'moderate'}
                    onValueChange={(val) => setMerchant({ ...merchant, ai_negotiation_style: val })}
                  >
                    <SelectTrigger className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[16px] border-border/70 bg-popover shadow-xl">
                      <SelectItem value="conservative">Conservative - Prioritize Margin</SelectItem>
                      <SelectItem value="moderate">Moderate - Balanced Growth</SelectItem>
                      <SelectItem value="aggressive">Aggressive - Prioritize Volume</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">Additional Instructions</Label>
                  <Badge variant="outline" className="text-[10px] font-bold border-border/70 text-muted-foreground/60 rounded-full px-2.5 bg-background shadow-sm">Internal Context</Badge>
                </div>
                <textarea
                  value={merchant.ai_custom_instructions}
                  onChange={(e) => setMerchant({ ...merchant, ai_custom_instructions: e.target.value })}
                  placeholder="Example: Always mention our 'Buy 2 Get 1' deal. Never offer discounts on luxury items..."
                  className="w-full min-h-[120px] p-4 bg-secondary/20 border border-border/70 rounded-[16px] focus:ring-1 focus:ring-emerald-500/20 text-[14px] font-medium transition-all outline-none resize-none leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Autonomous Strategy Section */}
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Zap className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">Agent Delegation</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Delegate closing power to the AI.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-[20px] border border-emerald-500/10 transition-all shadow-sm">
                <div>
                  <p className="text-[14px] font-bold text-foreground">Auto-Negotiation</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 font-medium leading-tight">Close deals without manual approval.</p>
                </div>
                <Switch
                  checked={merchant.ai_auto_negotiation_enabled}
                  onCheckedChange={(val) => setMerchant({ ...merchant, ai_auto_negotiation_enabled: val })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">Global Max Autonomous Discount</Label>
                      <Badge variant="outline" className="text-[9px] font-bold border-emerald-500/20 text-emerald-600 rounded-full px-2 bg-emerald-500/5">Default Policy</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          value={merchant.ai_max_discount_percentage}
                          onChange={(e) => setMerchant({ ...merchant, ai_max_discount_percentage: Number(e.target.value) })}
                          className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4 pr-8 focus:ring-1 focus:ring-emerald-500"
                          max={100}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted-foreground/60">%</span>
                      </div>
                      <Badge variant="outline" className="h-11 px-3.5 bg-background border-border/70 rounded-[12px] text-[11px] font-bold">
                        Floor: {100 - (merchant.ai_max_discount_percentage || 0)}%
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
                      Products without a custom floor price will inherit this limit. <Link href="/products" className="text-foreground font-semibold hover:underline">Customize per product →</Link>
                    </p>
                  </div>

                  <div className="p-4 bg-secondary/10 rounded-[20px] border border-border/70 border-dashed">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[13.5px] font-bold text-foreground">AI API Keys (BYOK)</p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5 font-medium leading-tight">Use your own OpenAI or Claude keys.</p>
                      </div>
                      <Link href="/settings/ai-keys">
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/70 text-[10px] font-bold uppercase tracking-wider">
                          Configure <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                <div className="space-y-2">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Bargaining Personality</Label>
                  <Select
                    value={merchant.bargain_ai_personality || 'friendly'}
                    onValueChange={(val) => setMerchant({ ...merchant, bargain_ai_personality: val })}
                  >
                    <SelectTrigger className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4">
                      <SelectValue placeholder="Select personality" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[16px] border-border/70 bg-popover shadow-xl">
                      <SelectItem value="friendly">Friendly - High Engagement</SelectItem>
                      <SelectItem value="balanced">Balanced - Optimized Margin</SelectItem>
                      <SelectItem value="tough">Tough - Premium Brand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Visibility & Safety</Label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-[13.5px] font-bold text-foreground">Assistant Visibility</p>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5 font-medium leading-tight">Show active work to storefront visitors.</p>
                    </div>
                    <Switch
                      checked={merchant.ai_mission_visibility_enabled}
                      onCheckedChange={(val) => setMerchant({ ...merchant, ai_mission_visibility_enabled: val })}
                    />
                  </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[13.5px] font-bold text-foreground">Bargain Mode</p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5 font-medium leading-tight">Allow direct haggling in chat sessions.</p>
                      </div>
                      <Switch
                        checked={merchant.bargain_mode_enabled}
                        onCheckedChange={(val) => setMerchant({ ...merchant, bargain_mode_enabled: val })}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <div className="flex-1">
                        <p className="text-[13.5px] font-bold text-foreground">Stacking Guard</p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5 font-medium leading-tight">Exclude bargained items from coupon discounts.</p>
                      </div>
                      <Switch
                        checked={merchant.exclude_bargained_from_discounts}
                        onCheckedChange={(val) => setMerchant({ ...merchant, exclude_bargained_from_discounts: val })}
                      />
                    </div>
                  </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Guardrails Info */}
          <Card className="border-border/70 bg-secondary/10 rounded-[24px] overflow-hidden border-dashed">
            <CardHeader className="px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-foreground/70" />
                <CardTitle className="text-[13px] font-bold uppercase tracking-wider text-foreground/70">Trust Guardrails</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-3">
              <div className="p-3.5 rounded-[16px] bg-background/50 border border-border/50 flex flex-col gap-1.5 shadow-sm">
                <span className="text-[12px] font-bold text-foreground/80">High Trust Shoppers (Score {'>'} 80)</span>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">AI can use full discount limit to close deals instantly without approval.</p>
              </div>
              <div className="p-3.5 rounded-[16px] bg-background/50 border border-border/50 flex flex-col gap-1.5 shadow-sm">
                <span className="text-[12px] font-bold text-foreground/80">Low Trust Shoppers (Score {'<'} 40)</span>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">AI will require manual approval regardless of settings to prevent abuse.</p>
              </div>
              <div className="flex items-start gap-2.5 mt-2 px-1">
                <Info className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground/70 italic font-medium">Offers expire after 60 minutes to maintain urgency.</p>
              </div>
            </CardContent>
          </Card>

          {/* Character Preview */}
          <AnimatePresence>
            {(merchant.ai_character_name || merchant.ai_character_persona) && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="border-border/70 bg-gradient-to-br from-secondary/40 to-background rounded-[24px] overflow-hidden shadow-md">
                  <CardHeader className="px-6 py-4 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-foreground" />
                      <CardTitle className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Live Preview</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 p-4 rounded-[20px] bg-background border border-border/50 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles className="w-12 h-12" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center shrink-0 overflow-hidden border border-border/70">
                        {merchant.ai_character_avatar_url ? (
                          <Image
                            src={merchant.ai_character_avatar_url}
                            alt=""
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Bot className="w-6 h-6 text-foreground/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-foreground truncate">
                            {merchant.ai_character_name || "AI Assistant"}
                          </span>
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                        {merchant.ai_character_subtitle && (
                          <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                            {merchant.ai_character_subtitle}
                          </p>
                        )}
                        <p className="text-[12px] text-muted-foreground/80 mt-2 font-medium leading-relaxed italic">
                          {merchant.ai_character_persona
                            ? `"${merchant.ai_character_persona.slice(0, 100)}${merchant.ai_character_persona.length > 100 ? "..." : ""}"`
                            : "Define a persona to see it in action."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
