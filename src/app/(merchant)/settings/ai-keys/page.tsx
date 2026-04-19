"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Key,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mic,
  MicOff,
  ChevronRight,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useMerchant } from "@/hooks/use-merchant";
import { toast } from "sonner";
import { MerchantPageSkeleton } from "@/components/merchant/page-skeleton";
import { Separator } from "@/components/ui/separator";

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Use your own OpenAI API key for standard GPT models and text generation.",
    badge: "Standard API",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "Use your own Claude API key for nuanced reasoning and long-form responses.",
    badge: "Text API",
    models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-5-haiku-20241022"],
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    description: "Use deployment-level Azure OpenAI credentials configured by the operator.",
    badge: "Deployment API",
    models: ["gpt-4o", "gpt-4.1", "gpt-4.1-mini"],
  },
];

export default function AIKeysSettings() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (merchant) {
      setProvider(merchant.ai_provider || "openai");
      setModel(merchant.ai_model || "");
      setHasExistingKey(!!merchant.ai_api_key_set);
    }
  }, [merchant]);

  const handleFetchModels = async (p: string, key: string, currentModel?: string) => {
    if (!key) return;
    setFetchingModels(true);
    try {
      const res = await fetch("/api/ai/fetch-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p, apiKey: key }),
      });
      const data = await res.json();
      if (data.models) {
        setFetchedModels(data.models);
        if (!currentModel && data.models.length > 0) {
          setModel(data.models[0]);
        }
      }
    } catch {
    } finally {
      setFetchingModels(false);
    }
  };

  const selectedProvider = PROVIDERS.find((p) => p.id === provider);

  const handleValidate = async () => {
    if (provider !== "azure" && !apiKey.trim()) {
      toast.error("Enter an API key first");
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch("/api/ai/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model: model || undefined }),
      });
      const data = await res.json();
      setValidationResult(data);
      if (data.valid) {
        toast.success("API key is valid");
        handleFetchModels(provider, apiKey, model);
      } else {
        toast.error(data.error || "Invalid API key");
      }
    } catch {
      setValidationResult({ valid: false, error: "Validation failed" });
      toast.error("Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = { ai_provider: provider, ai_model: model || null };

      if (provider === "azure") {
        updates.ai_api_key = null;
      } else if (apiKey.trim()) {
        updates.ai_api_key = apiKey.trim();
      }

      const response = await fetch('/api/merchant/settings/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to save settings');
      
      if (apiKey.trim()) {
        setHasExistingKey(true);
      }
      setApiKey("");
      setValidationResult(null);
      await refetch();
      toast.success("AI provider settings saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading) return <MerchantPageSkeleton />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">AI Infrastructure</Badge>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Bring Your Own Key</span>
          </div>
          <h2 className="text-[28px] font-semibold tracking-tight text-foreground">AI API Keys (BYOK)</h2>
          <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Use OpenAI, Anthropic, or Azure OpenAI. OpenAI and Anthropic use BYOK; Azure uses deployment-level credentials.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-[16px] bg-foreground text-background hover:bg-foreground/90 px-6 text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          <Save className="w-4 h-4 mr-2" />
          Save Provider
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Provider Selection */}
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                  <Key className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight">AI Provider</CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Select your preferred intelligence engine.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProvider(p.id);
                      setApiKey("");
                      setValidationResult(null);
                      setFetchedModels([]);
                      const defaultModel = p.models[0] || "";
                      setModel(defaultModel);
                    }}
                    className={`relative text-left p-5 rounded-[20px] border-2 transition-all ${
                      provider === p.id
                        ? "border-foreground bg-foreground/[0.03] shadow-sm"
                        : "border-border/70 bg-secondary/10 hover:border-border hover:bg-secondary/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[14px]">{p.name}</span>
                      {provider === p.id && (
                        <CheckCircle2 className="w-4 h-4 text-foreground" />
                      )}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed font-medium">{p.description}</p>
                    <Badge
                      variant={p.id === "anthropic" ? "destructive" : "secondary"}
                      className="mt-3 text-[9px] font-bold uppercase tracking-wider rounded-full"
                    >
                      {p.id === "anthropic" && <MicOff className="w-3 h-3 mr-1" />}
                      {(p.id === "openai" || p.id === "azure") && <Mic className="w-3 h-3 mr-1" />}
                      {p.badge}
                    </Badge>
                  </button>
                ))}
              </div>

              {(
                <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Separator className="opacity-50" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-0.5">
                        <label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">API Key</label>
                        <Link 
                          href={provider === "openai" ? "https://platform.openai.com/api-keys" : provider === "anthropic" ? "https://console.anthropic.com/settings/keys" : "https://portal.azure.com/"}
                          target="_blank"
                          className="text-[10px] font-bold text-foreground/60 hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          Get Key <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder={
                            hasExistingKey
                              ? "Key saved. Enter new key to replace."
                              : provider === "openai"
                              ? "sk-..."
                              : "sk-ant-..."
                          }
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setValidationResult(null);
                          }}
                          className="h-11 bg-secondary/20 border-border/70 text-[14px] font-mono rounded-[12px] px-4"
                        />
                        <Button
                          variant="outline"
                          onClick={handleValidate}
                          disabled={(provider !== "azure" && !apiKey.trim()) || validating}
                          className="h-11 px-4 border-border/70 bg-secondary/10 hover:bg-secondary/20 rounded-[12px] text-[11px] font-bold uppercase tracking-wider"
                        >
                          {validating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Test"
                          )}
                        </Button>
                      </div>
                      {validationResult && (
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-bold mt-1 px-1 ${
                            validationResult.valid ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {validationResult.valid ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {validationResult.valid ? "Key is valid" : validationResult.error}
                        </div>
                      )}
                      {provider !== "azure" && hasExistingKey && !apiKey && (
                        <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5 px-1 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Active key secured on file
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-0.5">
                        <label className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65">Model Selection</label>
                        {fetchingModels && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Scanning...
                          </div>
                        )}
                      </div>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="h-11 bg-secondary/20 border-border/70 text-[14px] rounded-[12px] px-4">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[16px] border-border/70 bg-popover shadow-xl">
                          {(fetchedModels.length > 0 ? fetchedModels : selectedProvider?.models)?.map((m) => (
                            <SelectItem key={m} value={m} className="text-[13.5px] font-medium py-2.5">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fetchedModels.length === 0 && !fetchingModels && (
                        <p className="text-[10px] text-muted-foreground/60 px-1 font-medium italic">
                          Showing common models. Use "Test" to discover your account's specific limits.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Important Notice */}
          <Card className="border-border/70 bg-secondary/10 rounded-[24px] overflow-hidden border-dashed">
            <CardHeader className="px-6 py-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-foreground/70" />
                <CardTitle className="text-[13px] font-bold uppercase tracking-wider text-foreground/70">BYOK Policy</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="p-4 rounded-[16px] bg-background/50 border border-border/50 flex flex-col gap-2 shadow-sm">
                <span className="text-[12px] font-bold text-foreground/80">Usage & Billing</span>
                <p className="text-[11.5px] text-muted-foreground font-medium leading-relaxed">
                  When using your own key, API usage costs are billed directly to your provider account. Convos does not charge extra for BYOK.
                </p>
              </div>
              <div className="p-4 rounded-[16px] bg-background/50 border border-border/50 flex flex-col gap-2 shadow-sm">
                <span className="text-[12px] font-bold text-foreground/80">Security</span>
                <p className="text-[11.5px] text-muted-foreground font-medium leading-relaxed">
                  Keys are encrypted at rest. We only use your key to power your own AI agents. You can revoke access at any time.
                </p>
              </div>
            </CardContent>
          </Card>

          {provider === "anthropic" && (
            <Card className="border-amber-500/20 bg-amber-500/5 rounded-[24px] overflow-hidden">
              <CardContent className="p-5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-amber-600">Provider Note</p>
                  <p className="text-[11.5px] text-amber-700/80 font-medium leading-relaxed">
                    Claude is configured as a text-first provider in this setup. Use OpenAI or Azure if you want the standard voice-compatible path.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {provider === "azure" && (
            <Card className="border-sky-500/20 bg-sky-500/5 rounded-[24px] overflow-hidden">
              <CardContent className="p-5 flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-sky-700">Deployment Credentials</p>
                  <p className="text-[11.5px] text-sky-800/80 font-medium leading-relaxed">
                    Azure OpenAI uses the deployment-level environment variables configured by the operator. You do not need to paste a merchant key here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
