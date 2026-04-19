"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Bot,
  Copy,
  Check,
  ExternalLink,
  Zap,
  ShoppingCart,
  Search,
  CreditCard,
  Globe,
  Info,
  ChevronRight,
  Terminal,
  Store,
  TrendingUp,
  Package,
  Clock,
  Settings,
  Puzzle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useMerchant } from "@/hooks/use-merchant";

  const STORE_TOOLS = [
    {
      name: "search_products",
      icon: Search,
      description: "Search products in your store only",
    },
    {
      name: "get_popular_products",
      icon: Zap,
      description: "Browse featured products from your store",
    },
    {
      name: "get_product_details",
      icon: Info,
      description: "Get full details for a specific product",
    },
    {
      name: "add_to_cart",
      icon: ShoppingCart,
      description: "Add products to a session-based cart",
    },
    {
      name: "view_cart",
      icon: ShoppingCart,
      description: "View cart contents and total",
    },
    {
      name: "generate_checkout_link",
      icon: CreditCard,
      description: "Create a Stripe checkout link",
    },
    {
      name: "get_store_info",
      icon: Globe,
      description: "Get store name, categories, and currency",
    },
    {
      name: "render_products_widget",
      icon: Bot,
      description: "Display products visually within ChatGPT",
    },
  ];

const ADMIN_TOOLS = [
  {
    name: "get_store_stats",
    icon: TrendingUp,
    description: "View sales performance and pending tasks",
  },
  {
    name: "list_recent_orders",
    icon: Clock,
    description: "Review recent customer orders and status",
  },
  {
    name: "get_order_details",
    icon: Info,
    description: "Get full items and customer info for an order",
  },
  {
    name: "update_order_status",
    icon: Check,
    description: "Mark orders as shipped or delivered",
  },
  {
    name: "list_products",
    icon: Package,
    description: "View inventory and price list",
  },
  {
    name: "update_product",
    icon: Settings,
    description: "Quickly update product price or stock",
  },
];

export default function MCPPage() {
  const { merchant, loading: merchantLoading } = useMerchant();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"store" | "admin">("store");
  const [config, setConfig] = useState<any>(null);

  const fetchMerchantAndConfig = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch MCP Config
    try {
      const response = await fetch('/api/mcp/config', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch {
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!merchantLoading) {
      fetchMerchantAndConfig();
    }
  }, [fetchMerchantAndConfig, merchantLoading]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const endpointBase =
    merchant?.custom_domain && merchant?.domain_verified
      ? `https://${merchant.custom_domain}`
      : baseUrl;
  const storeUrl = config?.endpoints?.store || (merchant ? `${endpointBase}/api/mcp/${merchant.id}` : `${baseUrl}/api/mcp/store`);
  const adminUrl = config?.endpoints?.admin || (merchant ? `${endpointBase}/api/mcp/admin?merchantId=${merchant.id}` : `${baseUrl}/api/mcp/admin`);

  const getActiveUrl = () => {
    if (activeTab === "store") return storeUrl;
    return adminUrl;
  };

  const getActiveTools = () => {
    if (activeTab === "store") return STORE_TOOLS;
    return ADMIN_TOOLS;
  };

  const activeUrl = getActiveUrl();
  const activeTools = getActiveTools();

  const authKey = config?.apiKey || "";

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="p-1.5 rounded-md hover:bg-secondary/30 transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied === id ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-[860px] mx-auto py-8 px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-1/3" />
          <div className="h-32 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="page-header flex-col gap-3 xl:flex-row xl:items-end mb-8">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Integrations</span>
            <Badge className="rounded-full border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight text-purple-600">
              Beta
            </Badge>
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground leading-tight">ChatGPT MCP</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Connect your self-hosted store to ChatGPT using the Model Context Protocol.
          </p>
        </div>

        <div className="flex items-center gap-2 xl:justify-end">
          <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Server Live</span>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="mb-8 inline-flex h-10 items-center rounded-2xl border border-border/70 bg-card p-1 shadow-sm">
          <TabsTrigger
            value="store"
            className="rounded-xl px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground hover:text-foreground"
          >
            <Store className="w-3.5 h-3.5 mr-2" />
            Store
          </TabsTrigger>
          <TabsTrigger
            value="admin"
            className="rounded-xl px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-3.5 h-3.5 mr-2" />
            Admin
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            {/* Description Banner */}
            <Card className={`overflow-hidden border-border/70 bg-card ${
              activeTab === "store" ? "border-blue-500/20 bg-blue-500/5" :
              "border-green-500/20 bg-green-500/5"
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                    activeTab === "store" ? "border-blue-500/20 bg-blue-500/10 text-blue-600" :
                    "border-green-500/20 bg-green-500/10 text-green-600"
                  }`}>
                    {activeTab === "store" ? <Store className="h-5 w-5" /> :
                     <Settings className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {activeTab === "store" ? "Store MCP — Your Store Only" :
                       "Merchant Admin MCP — Control Your Store"}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {activeTab === "store" ? "This URL scopes ChatGPT to your store only. Use this if you want to expose a single-store shopping assistant." : "Connect ChatGPT to your merchant dashboard. Ask about sales, manage orders, and update inventory using natural language."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Config Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="overflow-hidden border-border/70 bg-card">
                <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50">
                      <Terminal className="h-4 w-4 text-foreground" />
                    </div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">MCP Server URL</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/25 border border-border/70 px-4 py-3 font-mono text-[11px]">
                    <span className="flex-1 text-foreground truncate">{activeUrl}</span>
                    <CopyButton text={activeUrl} id="mcp-url" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/15 border border-border/70">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Endpoint Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/70 bg-card">
                <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50">
                      <Zap className="h-4 w-4 text-amber-500" />
                    </div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">Authorization</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/25 border border-border/70 px-4 py-3 font-mono text-[11px]">
                    <span className="flex-1 text-foreground truncate">
                      {authKey ? `Bearer ${authKey}` : "No key configured"}
                    </span>
                    {authKey && <CopyButton text={authKey} id="mcp-key" />}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl h-9 text-[10px] font-bold uppercase tracking-wider border-border/70 hover:bg-secondary/45"
                    onClick={() => {
                      const fullConfig = `URL: ${activeUrl}\nAuth: Bearer ${authKey}`;
                      copyToClipboard(fullConfig, 'full-config');
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Copy All Details
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Available Tools */}
            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50">
                      <Puzzle className="h-4 w-4 text-foreground" />
                    </div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">Available Tools</CardTitle>
                  </div>
                  <Badge variant="secondary" className="rounded-full border border-border/70 px-2 py-0.5 text-[9px] font-bold uppercase">
                    {activeTools.length} Exposed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y divide-border/50">
                  {activeTools.map((tool) => (
                    <div key={tool.name} className="flex items-start gap-4 p-5 hover:bg-secondary/15 transition-colors">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        activeTab === "admin" ? "border-green-500/20 bg-green-500/5 text-green-600" : "border-purple-500/20 bg-purple-500/5 text-purple-600"
                      }`}>
                        <tool.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold font-mono text-foreground">{tool.name}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Curl Tester */}
            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50">
                      <Terminal className="h-4 w-4 text-foreground" />
                    </div>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider">Verify Endpoint</CardTitle>
                  </div>
                  <a href="https://developers.openai.com/apps-sdk/" target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3 w-3 mr-1.5" />
                      OpenAI Docs
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="relative group">
                  <div className="rounded-2xl bg-[#0d1117] p-5 font-mono text-[11px] text-green-400 overflow-x-auto border border-white/5">
                    <div className="text-muted-foreground/50 mb-2"># Initialize handshake</div>
                    <div className="flex gap-2"><span className="text-purple-400">curl</span> -X POST {activeUrl} \</div>
                    <div className="pl-4">-H "Content-Type: application/json" \</div>
                    {authKey && <div className="pl-4">-H "Authorization: Bearer {authKey}" \</div>}
                    <div className="pl-4 pb-4">{`-d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}'`}</div>
                    <div className="text-muted-foreground/50 mb-2 pt-4 border-t border-white/5"># List tools</div>
                    <div className="flex gap-2"><span className="text-purple-400">curl</span> -X POST {activeUrl} \</div>
                    <div className="pl-4">-H "Content-Type: application/json" \</div>
                    <div className="pl-4">{`-d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'`}</div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <CopyButton
                      text={`curl -X POST ${activeUrl} -H "Content-Type: application/json" ${authKey ? `-H "Authorization: Bearer ${authKey}" ` : ''}-d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'`}
                      id="curl-cmd"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Setup Steps */}
            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-4 py-3.5">
                <CardTitle className="text-sm font-semibold tracking-tight">Setup Guide</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {[
                  {
                    step: "01",
                    title: "Open Settings",
                    desc: "Go to Settings → Apps & Connectors in ChatGPT.",
                  },
                  {
                    step: "02",
                    title: "New Connector",
                    desc: `Paste your ${activeTab === "admin" ? "Admin" : ""} MCP Server URL. Name it ${activeTab === "admin" ? '"Store Admin"' : '"Convos Shopping"'}.`,
                  },
                  {
                    step: "03",
                    title: activeTab === "admin" ? "Manage Store" : "Start Shopping",
                    desc: activeTab === "store" ? `Ask about ${merchant?.store_name || "your store"}.` : "Ask about your sales performance.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${
                      activeTab === "admin" ? "border-green-500/20 bg-green-500/5 text-green-600" : "border-purple-500/20 bg-purple-500/5 text-purple-600"
                    }`}>
                      {item.step}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Example Prompts */}
            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-4 py-3.5">
                <CardTitle className="text-sm font-semibold tracking-tight">Example Prompts</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1">
                {(activeTab === "store"
                  ? [
                      `Search items < $50 in ${merchant?.store_name || "store"}`,
                      "Show me popular products",
                      "Add 2 of [product] to cart",
                      "What's in my cart?",
                    ]
                  : [
                      "How many sales today?",
                      "Show me the last 5 orders",
                      "Mark order #1234 as shipped",
                      "Which items are low stock?",
                    ]
                ).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => copyToClipboard(prompt, `prompt-${i}`)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary/45 group"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/50 group-hover:bg-background">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground truncate">
                        {prompt}
                      </p>
                    </div>
                    {copied === `prompt-${i}` ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Docs Banner */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Agents SDK</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Connect in code using <code className="text-purple-600 font-bold bg-purple-500/10 px-1 rounded">MCPServerStreamableHttp</code> with your MCP URL.
              </p>
              <a href="https://developers.openai.com/apps-sdk/" target="_blank" rel="noopener noreferrer">
                <Button className="w-full h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold uppercase tracking-wider">
                  View Docs
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
