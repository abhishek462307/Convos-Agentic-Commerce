"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Zap, 
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface Suggestion {
  id: string;
  type: "opportunity" | "threat" | "optimization";
  title: string;
  description: string;
  impact: string;
  actionText: string;
  data: any;
}

export function IntelligenceSuggestions({ activeIntents, pendingPlans, merchant }: any) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    generateSuggestions();
  }, [activeIntents, pendingPlans]);

  const generateSuggestions = () => {
    const newSuggestions: Suggestion[] = [];

    // 1. Group intents by product to find high-demand items
    const productIntents: Record<string, any[]> = {};
    activeIntents.forEach((intent: any) => {
      const goal = intent.goal.toLowerCase();
      if (goal.includes("coffee") || goal.includes("mug") || goal.includes("roast")) {
        const key = goal.includes("coffee") ? "Premium Coffee" : "Artisan Mugs";
        productIntents[key] = [...(productIntents[key] || []), intent];
      }
    });

    Object.entries(productIntents).forEach(([product, intents]) => {
      if (intents.length >= 2) {
        newSuggestions.push({
          id: `demand-${product}`,
          type: "opportunity",
          title: `High Intent for ${product}`,
          description: `${intents.length} customer agents are currently searching or waiting for ${product}.`,
          impact: "+$450 Est. Revenue",
          actionText: "Sponsor Missions",
          data: { type: "sponsor_group", product, intents }
        });
      }
    });

    // 2. Identify price-sensitive high-trust customers
    const priceWaiters = pendingPlans.filter((p: any) => 
      p.steps?.some((s: string) => s.toLowerCase().includes("price") || s.toLowerCase().includes("discount"))
    );

    if (priceWaiters.length > 0) {
      newSuggestions.push({
        id: "price-optimization",
        type: "optimization",
        title: "Closing Opportunity",
        description: `${priceWaiters.length} high-trust shoppers are 10% away from their budget target.`,
        impact: "Close 3 Deals Now",
        actionText: "Auto-Negotiate",
        data: { type: "auto_negotiate", plans: priceWaiters }
      });
    }

    // 3. Stock Alerts
    if (activeIntents.some((i: any) => i.goal.toLowerCase().includes("out of stock"))) {
      newSuggestions.push({
        id: "inventory-nudge",
        type: "threat",
        title: "Lost Revenue Alert",
        description: "Multiple agents are bouncing due to out-of-stock items.",
        impact: "-$120 Potential Loss",
        actionText: "Update Stock",
        data: { type: "link", href: "/products" }
      });
    }

    setSuggestions(newSuggestions);
  };

  const handleAction = async (suggestion: Suggestion) => {
    setProcessingId(suggestion.id);
    try {
      if (suggestion.data.type === "sponsor_group") {
        const intentIds = suggestion.data.intents.map((i: any) => i.id);
        // Mass sponsor plans for these intents
        await supabase
          .from("agent_plans")
          .update({ is_approved: true, is_sponsored: true, status: "in_progress" })
          .in("intent_id", intentIds);
      } else if (suggestion.data.type === "auto_negotiate") {
        const planIds = suggestion.data.plans.map((p: any) => p.id);
        await supabase
          .from("agent_plans")
          .update({ is_approved: true, status: "in_progress" })
          .in("id", planIds);
      }
      
      // Refresh
      window.location.reload();
    } catch (error) {
    } finally {
      setProcessingId(null);
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-4 mb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          <h2 className="text-xl font-bold tracking-tight">AI Merchant Assistant</h2>
        </div>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          {suggestions.length} Proactive Suggestions
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.map((s) => (
          <Card key={s.id} className="border-border bg-white/[0.01] hover:bg-white/[0.02] transition-all overflow-hidden relative group">
            <div className={`absolute top-0 left-0 w-1 h-full ${
              s.type === "opportunity" ? "bg-emerald-500" :
              s.type === "threat" ? "bg-red-500" : "bg-vercel-blue"
            }`} />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className={`text-[8px] font-bold uppercase tracking-widest ${
                   s.type === "opportunity" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" :
                   s.type === "threat" ? "text-red-500 border-red-500/20 bg-red-500/5" : 
                   "text-vercel-blue border-vercel-blue/20 bg-vercel-blue/5"
                }`}>
                  {s.type}
                </Badge>
                <span className="text-[10px] font-bold text-foreground/70">{s.impact}</span>
              </div>
              <CardTitle className="text-sm font-bold">{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {s.description}
              </p>
              <Button 
                size="sm" 
                className={`w-full text-[11px] h-8 font-bold ${
                  s.type === "opportunity" ? "bg-emerald-600 hover:bg-emerald-700" :
                  s.type === "threat" ? "bg-red-600 hover:bg-red-700" : "bg-vercel-blue hover:bg-vercel-blue/90"
                }`}
                onClick={() => handleAction(s)}
                disabled={processingId === s.id}
              >
                {processingId === s.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                ) : (
                  <Zap className="w-3.5 h-3.5 mr-2 fill-current" />
                )}
                {s.actionText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
