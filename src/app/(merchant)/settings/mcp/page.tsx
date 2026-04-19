"use client"

import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  Info,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';

export default function McpSettingsPage() {
  const { merchant, loading, refetch } = useMerchant();
  const [generating, setGenerating] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/merchant/settings/mcp-key', {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to generate key');
      refetch();
      toast.success("New API key generated");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate key");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  if (loading || !merchant) return <MerchantPageSkeleton />;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const endpointBase =
    merchant.custom_domain && merchant.domain_verified
      ? `https://${merchant.custom_domain}`
      : baseUrl;
  const mcpEndpoint = `${endpointBase}/api/mcp/${merchant.id}`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">ChatGPT MCP</h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Connect your store directly to ChatGPT using the Model Context Protocol.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Connection Details */}
          <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-white/5 py-8 px-8 bg-secondary/25">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-bold tracking-tight">Connection Details</CardTitle>
              </div>
              <CardDescription className="text-sm text-muted-foreground font-medium mt-1 ml-6">
                Use these details to connect ChatGPT to your store.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
            <div className="space-y-4">
              <Label className="text-xs font-medium text-muted-foreground">Server URL (MCP Endpoint)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    readOnly 
                    value={mcpEndpoint} 
                    className="font-mono text-sm bg-secondary/20 border-border pr-10 h-11" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="shrink-0 h-11 w-11 border-border bg-secondary/20 hover:bg-secondary/30"
                  onClick={() => copyToClipboard(mcpEndpoint, setCopiedEndpoint)}
                >
                  {copiedEndpoint ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">API Key</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateKey}
                  disabled={generating}
                  className="h-6 text-[10px] font-bold text-muted-foreground hover:text-foreground px-2"
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  {merchant?.mcp_api_key ? 'Regenerate Key' : 'Generate Key'}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    readOnly 
                    type="password"
                    value={merchant?.mcp_api_key || ''} 
                    placeholder="No API key generated yet"
                    className="font-mono text-sm bg-secondary/20 border-border pr-10 h-11" 
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={!merchant?.mcp_api_key}
                  className="shrink-0 h-11 w-11 border-border bg-secondary/20 hover:bg-secondary/30"
                  onClick={() => copyToClipboard(merchant?.mcp_api_key || '', setCopiedKey)}
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {!merchant?.mcp_api_key && (
                <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500">
                  <ShieldAlert className="w-4 h-4" />
                  <AlertTitle className="text-xs font-bold ml-2">Key Required</AlertTitle>
                  <AlertDescription className="text-[11px] ml-2 opacity-90">
                    You must generate an API key to secure your MCP connection.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="border-b border-white/5 py-8 px-8 bg-secondary/25">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight">How to Connect</CardTitle>
                <CardDescription className="text-sm text-muted-foreground font-medium mt-1">
                  Follow these steps to add your store to ChatGPT.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <ol className="space-y-6 list-decimal list-inside text-sm text-muted-foreground marker:text-foreground/50 marker:font-bold">
              <li className="pl-2">
                <span className="font-medium text-foreground">Open ChatGPT Settings</span>
                <p className="mt-1 ml-6 text-xs leading-relaxed">
                  Go to ChatGPT, click your profile icon, and select <span className="font-bold text-foreground">Settings & Beta</span>.
                </p>
              </li>
              <li className="pl-2">
                <span className="font-medium text-foreground">Add Connected App</span>
                <p className="mt-1 ml-6 text-xs leading-relaxed">
                  Navigate to <span className="font-bold text-foreground">Connected Apps</span> (or 'Data Controls' {'>'} 'Improves the model for everyone' depending on version) and click <span className="font-bold text-foreground">Add App</span>.
                </p>
              </li>
              <li className="pl-2">
                <span className="font-medium text-foreground">Enter Server URL</span>
                <p className="mt-1 ml-6 text-xs leading-relaxed">
                  Paste the <span className="font-mono text-xs bg-secondary/25 px-1 py-0.5 rounded">Server URL</span> from above.
                </p>
              </li>
              <li className="pl-2">
                <span className="font-medium text-foreground">Authenticate</span>
                <p className="mt-1 ml-6 text-xs leading-relaxed">
                  When prompted for authentication, choose <span className="font-bold text-foreground">API Key</span> (or Bearer Token) and paste your <span className="font-mono text-xs bg-secondary/25 px-1 py-0.5 rounded">API Key</span>.
                </p>
              </li>
            </ol>
            
            <div className="mt-8 p-4 bg-secondary/25 border border-white/5 rounded-xl flex items-start gap-3">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Once connected, you can ask ChatGPT things like <span className="italic text-foreground">"Search for products in my store"</span>, <span className="italic text-foreground">"Check my inventory"</span>, or <span className="italic text-foreground">"Create a checkout link for a customer"</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
