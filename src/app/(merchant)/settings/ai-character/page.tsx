"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Save,
  Loader2,
  Upload,
  X,
  Sparkles,
  MessageSquare,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMerchant } from "@/hooks/use-merchant";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { MerchantPageSkeleton } from "@/components/merchant/page-skeleton";
import Image from "next/image";

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

export default function AICharacterPage() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [characterName, setCharacterName] = useState("");
  const [persona, setPersona] = useState("");
  const [backstory, setBackstory] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (merchant) {
      setCharacterName(merchant.ai_character_name || "");
      setPersona(merchant.ai_character_persona || "");
      setBackstory(merchant.ai_character_backstory || "");
      setAvatarUrl(merchant.ai_character_avatar_url || null);
      setSubtitle(merchant.branding_settings?.ai_character_subtitle || "");
    }
  }, [merchant]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const url = await uploadFile(file, "merchant-assets", `characters/${merchant!.id}`);
      setAvatarUrl(url);
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
            ai_character_name: characterName || null,
            ai_character_persona: persona || null,
            ai_character_backstory: backstory || null,
            ai_character_avatar_url: avatarUrl || null,
            branding_settings: {
              ai_character_subtitle: subtitle || null,
            },
          },
          mergeKeys: ['branding_settings'],
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to save character');
      toast.success("AI character saved");
      refetch();
    } catch (err) {
      toast.error("Failed to save character");
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading) return <MerchantPageSkeleton />;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 lg:px-8">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Personalization
          </span>
        </div>
        <h1 className="text-lg font-bold tracking-tight">AI Character</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Give your AI a unique identity. Define a character with a name, avatar, and personality that your customers will interact with.
        </p>
      </div>

      <div className="grid gap-8">
        <Card className="border-border bg-white/[0.01]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-4 h-4" />
              Identity
            </CardTitle>
            <CardDescription className="text-xs">
              Set a name and avatar for your AI character.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-6">
              <div className="shrink-0">
                <div
                  className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500/50 transition-colors group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : avatarUrl ? (
                    <>
                      <Image
                        src={avatarUrl}
                        alt="Character avatar"
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Upload className="w-5 h-5" />
                      <span className="text-[9px] font-medium">Upload</span>
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
                {avatarUrl && (
                  <button
                    onClick={() => setAvatarUrl(null)}
                    className="mt-2 text-[10px] text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 mx-auto"
                  >
                    <X className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Character Name
                    </Label>
                    <Input
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      placeholder="e.g. Luna, Max, Sage..."
                      className="bg-background border-border"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      This name will be shown to customers as the AI assistant's identity.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Subtitle / Tagline
                    </Label>
                    <Input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="e.g. Your personal coffee guide, Always here to help..."
                      className="bg-background border-border"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      A short description shown below the character name in chat.
                    </p>
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-white/[0.01]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Personality
            </CardTitle>
            <CardDescription className="text-xs">
              Define how your AI character behaves and communicates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">
                Quick Presets
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {PERSONA_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setPersona(preset.persona)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      persona === preset.persona
                        ? "border-purple-500/50 bg-purple-500/10"
                        : "border-border bg-background hover:border-purple-500/30 hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-xs font-semibold block mb-1">{preset.label}</span>
                    <span className="text-[10px] text-muted-foreground line-clamp-2">
                      {preset.persona}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-border" />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Persona Description
              </Label>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="Describe how your AI should talk, what personality traits it has, what kind of language it uses..."
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Be as specific as you want. This directly shapes how the AI responds to customers.
              </p>
            </div>

            <Separator className="bg-border" />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Backstory / Context
              </Label>
              <textarea
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                placeholder="e.g. Luna is the head barista at our virtual coffee bar. She's been roasting beans for 10 years and knows every origin story..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Give your character a story. This helps the AI stay in character and provide contextual responses.
              </p>
            </div>
          </CardContent>
        </Card>

        {(characterName || persona) && (
          <Card className="border-dashed border-border bg-transparent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-foreground" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest">
                  Preview
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/20 border border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                  <div>
                    <span className="text-xs font-bold">
                      {characterName || "AI Assistant"}
                    </span>
                    {subtitle && (
                      <p className="text-[10px] text-muted-foreground">
                        {subtitle}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                    {persona
                      ? `"${persona.slice(0, 120)}${persona.length > 120 ? "..." : ""}"`
                      : "No personality defined yet."}
                  </p>
                  {backstory && (
                    <p className="text-[10px] text-muted-foreground/70 mt-2 italic">
                      {backstory.slice(0, 100)}{backstory.length > 100 ? "..." : ""}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pt-2">
          <Button
            className="w-full bg-white text-black hover:bg-white/90 font-bold"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Character
          </Button>
        </div>
      </div>
    </div>
  );
}
