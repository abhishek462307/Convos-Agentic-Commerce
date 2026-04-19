"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  ExternalLink,
  Inbox,
  MousePointer2,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMerchant } from "@/hooks/use-merchant";
import { supabase } from "@/lib/supabase";
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

type AttributionConversation = {
  id: string;
  created_at: string;
  consumer_email?: string | null;
  event_data: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  } | null;
};

export default function AttributionPage() {
  const { merchant, loading: merchantLoading } = useMerchant();
  const [events, setEvents] = useState<AttributionConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttributionData = useCallback(async () => {
    if (!merchant) return;

    try {
      const { data, error } = await supabase
        .from('storefront_conversations')
        .select('id, created_at, consumer_email, event_data')
        .eq('merchant_id', merchant.id)
        .eq('event_type', 'ad_referral')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents((data || []) as AttributionConversation[]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [merchant]);

  useEffect(() => {
    fetchAttributionData();
  }, [fetchAttributionData]);

  if (merchantLoading || loading) return <MerchantPageSkeleton />;

  const sources = Object.entries(
    events.reduce<Record<string, number>>((acc, event) => {
      const source = event.event_data?.utm_source || 'Direct / Organic';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([source, visits]) => ({ source, visits }))
    .sort((left, right) => right.visits - left.visits);

  const campaigns = Object.entries(
    events.reduce<Record<string, number>>((acc, event) => {
      const campaign = event.event_data?.utm_campaign || '';
      if (campaign) {
        acc[campaign] = (acc[campaign] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .map(([campaign, visits]) => ({ campaign, visits }))
    .sort((left, right) => right.visits - left.visits);

  const aiInfluencedRate = events.length > 0
    ? Math.min(
        100,
        Math.round(
          (events.filter((event) => event.event_data?.utm_medium === 'ai').length / events.length) * 100
        )
      )
    : 0;

  const hasAttributionData = events.length > 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground text-blue-500">Ad Attribution</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Traffic Sources</h1>
          <p className="text-muted-foreground text-sm mt-2">Track merchant-local referral traffic and campaign tags without any platform-wide event model.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1">
            <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />
            Merchant-local attribution
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="border border-border bg-background p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MousePointer2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tracked Referrals</p>
              <p className="text-xl font-bold">{events.length}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Captured from merchant-local UTM parameters.</p>
        </Card>
        <Card className="border border-border bg-background p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top Source</p>
              <p className="text-xl font-bold">{sources[0]?.source || 'N/A'}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Highest volume referral channel.</p>
        </Card>
        <Card className="border border-border bg-background p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">AI Influenced</p>
              <p className="text-xl font-bold">{aiInfluencedRate}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Share of referrals tagged with AI-origin medium metadata.</p>
        </Card>
      </div>

      {!hasAttributionData && (
        <Card className="border border-dashed border-border bg-background/60 mb-12">
          <CardContent className="px-6 py-10 flex flex-col items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-secondary/40 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold">No attribution data yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Add UTM parameters to your storefront links and new merchant-local referral visits will appear here automatically.
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1 text-xs">
              Empty state is expected until tracked visits arrive
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <Card className="border-border bg-background overflow-hidden">
          <CardHeader className="border-b border-border bg-secondary/25 py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-widest">Top Referral Sources</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {sources.map(({ source, visits }) => (
                <div key={source} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">{source}</span>
                  </div>
                  <Badge variant="outline" className="font-bold tabular-nums">{visits} visits</Badge>
                </div>
              ))}
              {sources.length === 0 && (
                <div className="p-12 text-center text-muted-foreground text-xs italic">
                  No referral data captured yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-background overflow-hidden">
          <CardHeader className="border-b border-border bg-secondary/25 py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-widest">Active Campaign Tags</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {campaigns.map(({ campaign, visits }) => (
                <div key={campaign} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/5 flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">{campaign}</span>
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold tabular-nums">{visits} visits</Badge>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="p-12 text-center text-muted-foreground text-xs italic">
                  No campaign-specific data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-background overflow-hidden">
        <CardHeader className="border-b border-border bg-secondary/25 py-4">
          <CardTitle className="text-xs font-bold uppercase tracking-widest">Recent Referral Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01] border-b border-border">
                <th className="px-6 py-4 text-xs text-muted-foreground">Source</th>
                <th className="px-6 py-4 text-xs text-muted-foreground">Campaign</th>
                <th className="px-6 py-4 text-xs text-muted-foreground">Customer</th>
                <th className="px-6 py-4 text-xs text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">
                      {event.event_data?.utm_source || 'direct'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                    {event.event_data?.utm_campaign || '-'}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold">
                    {event.consumer_email || 'Anonymous'}
                  </td>
                  <td className="px-6 py-4 text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground text-xs italic">
                    Waiting for first referral traffic...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
