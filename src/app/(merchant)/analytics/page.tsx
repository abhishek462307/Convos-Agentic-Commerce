"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Percent,
  Handshake,
  Sparkles,
  Zap,
  MousePointer2,
  RefreshCw,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

const DynamicRevenueChart = dynamic(
  () => import('@/components/charts/SalesAreaChart').then(mod => ({ default: mod.RevenueAreaChart })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div> }
);
const DynamicWeekdayChart = dynamic(
  () => import('@/components/charts/SalesAreaChart').then(mod => ({ default: mod.WeekdayBarChart })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div> }
);
const DynamicOrdersChart = dynamic(
  () => import('@/components/charts/SalesAreaChart').then(mod => ({ default: mod.OrdersBarChart })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div> }
);

type Period = 'day' | 'week' | 'month';

const rangeOptions: Array<{ label: string; value: Period }> = [
  { label: '1D', value: 'day' },
  { label: '7D', value: 'week' },
  { label: '30D', value: 'month' },
];

interface DailyData {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  discounts: number;
}

interface WeekdayData {
  day: string;
  revenue: number;
  orders: number;
}

export default function SalesRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalDiscounts: 0,
    avgOrderValue: 0,
    previousRevenue: 0,
    previousOrders: 0,
    previousDiscounts: 0,
    visitors: 0,
    conversionRate: 0,
    aiAssistedOrders: 0,
    aiRevenueDelta: 0,
    totalBargainSavings: 0,
    bargainedOrders: 0,
    previousBargainSavings: 0
  });
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [topDiscounts, setTopDiscounts] = useState<any[]>([]);
  const [topBargains, setTopBargains] = useState<any[]>([]);
  const [weekdayData, setWeekdayData] = useState<WeekdayData[]>([]);
  const [bestDay, setBestDay] = useState<{ day: string, revenue: number } | null>(null);
  const { merchant } = useMerchant();

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    const response = await fetch(`/api/merchant/analytics?period=${period}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      setLoading(false);
      setIsRefreshing(false);
      return;
    }
    const data = await response.json();
    setStats(data.stats);
    setChartData(data.chartData || []);
    setTopDiscounts(data.topDiscounts || []);
    setTopBargains(data.topBargains || []);
    setWeekdayData(data.weekdayData || []);
    setBestDay(data.bestDay || null);
    setLoading(false);
    setIsRefreshing(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!merchant?.id) return;

    const ordersChannel = supabase
      .channel(`analytics-orders-${merchant.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `merchant_id=eq.${merchant.id}`
      }, () => {
        fetchData(true);
      })
      .subscribe();

    const conversationsChannel = supabase
      .channel(`analytics-conversations-${merchant.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'storefront_conversations',
        filter: `merchant_id=eq.${merchant.id}`
      }, () => {
        fetchData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [merchant?.id, fetchData]);

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueChange = getChangePercent(stats.totalRevenue, stats.previousRevenue);
  const ordersChange = getChangePercent(stats.totalOrders, stats.previousOrders);
  const discountsChange = getChangePercent(stats.totalDiscounts, stats.previousDiscounts);
  const bargainChange = getChangePercent(stats.totalBargainSavings, stats.previousBargainSavings);

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      <header className="page-header flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/85 shadow-sm mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Live commerce operations
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Command Center</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Watch revenue, AI activity, and storefront readiness from one calmer control surface for {merchant?.store_name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 xl:justify-end">
          <button 
            onClick={() => fetchData()}
            disabled={isRefreshing}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card hover:bg-secondary/40 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/70 bg-card p-1.5 shadow-sm">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`rounded-xl px-5 py-2.5 text-[11px] font-bold tracking-tight transition-all ${
                  period === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <StatCard 
          title="Revenue" 
          value={formatCurrency(stats.totalRevenue, merchant?.currency, merchant?.locale)} 
          detail="Total sales"
          trend={revenueChange}
          icon={DollarSign}
        />
        <StatCard 
          title="Orders" 
          value={stats.totalOrders.toLocaleString()} 
          detail="Fulfilled deals"
          trend={ordersChange}
          icon={ShoppingBag}
        />
        <StatCard 
          title="Visitors" 
          value={stats.visitors.toLocaleString()} 
          detail="Store sessions"
          trend={0}
          icon={MousePointer2}
        />
        <StatCard 
          title="Conversion" 
          value={`${stats.conversionRate.toFixed(1)}%`} 
          detail="Funnel health"
          trend={0}
          icon={TrendingUp}
        />
        <StatCard 
          title="Avg Basket" 
          value={formatCurrency(stats.avgOrderValue, merchant?.currency, merchant?.locale)} 
          detail="Value per sale"
          trend={0}
          icon={Zap}
        />
        <StatCard 
          title="Promos" 
          value={formatCurrency(stats.totalDiscounts, merchant?.currency, merchant?.locale)} 
          detail="Active marketing"
          trend={discountsChange}
          icon={Tag}
        />
        <StatCard 
          title="Bargains" 
          value={formatCurrency(stats.totalBargainSavings, merchant?.currency, merchant?.locale)} 
          detail="AI-negotiated"
          trend={bargainChange}
          icon={Handshake}
        />
      </div>

      {/* Main Bento Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Revenue Flow - Large Card (8 cols) */}
        <div className="xl:col-span-8 space-y-5">
          <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Revenue Flow</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Detailed performance tracking for {period}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Total Period Revenue</p>
                    <p className="mt-1 text-[32px] font-semibold tracking-tight text-foreground">
                      {formatCurrency(stats.totalRevenue, merchant?.currency, merchant?.locale)}
                    </p>
                  </div>
                  <Badge variant="secondary" className={`shrink-0 rounded-full border border-border/70 px-3 py-1 text-xs ${revenueChange >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                    {revenueChange >= 0 ? <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-1 h-3.5 w-3.5" />}
                    {Math.abs(revenueChange).toFixed(1)}% vs prior
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] border-b border-border/70 px-3 py-3 sm:px-5 lg:px-6">
                <DynamicRevenueChart 
                  data={chartData} 
                  period={period} 
                  formatCurrency={(v: number) => formatCurrency(v, merchant?.currency, merchant?.locale)} 
                />
              </div>
              <div className="grid gap-2.5 px-5 py-4 md:grid-cols-4 lg:px-6 bg-secondary/10">
                <SummaryPill label="Avg Deal Value" value={formatCurrency(stats.avgOrderValue, merchant?.currency, merchant?.locale)} />
                <SummaryPill label="Unique Visitors" value={stats.visitors.toLocaleString()} />
                <SummaryPill label="Bargain Locks" value={stats.bargainedOrders.toString()} />
                <SummaryPill label="Closure Rate" value={`${stats.conversionRate.toFixed(1)}%`} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold tracking-tight">Velocity by Day</CardTitle>
                  {bestDay && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-border/70 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      PEAK: {bestDay.day}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[280px]">
                  <DynamicWeekdayChart 
                    data={weekdayData} 
                    formatCurrency={(v: number) => formatCurrency(v, merchant?.currency, merchant?.locale)} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
                <CardTitle className="text-base font-semibold tracking-tight">Deal Count</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[280px]">
                  <DynamicOrdersChart data={chartData} period={period} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight">Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                <FunnelStep 
                  label="Reach" 
                  value={stats.visitors.toLocaleString()} 
                  sub="Unique sessions"
                  percent={100}
                  color="bg-primary/20"
                />
                <FunnelStep 
                  label="Engagement" 
                  value={stats.aiAssistedOrders.toLocaleString()} 
                  sub="AI-led sessions"
                  percent={stats.visitors > 0 ? (stats.aiAssistedOrders / stats.visitors) * 100 : 0}
                  color="bg-primary/40"
                />
                <FunnelStep 
                  label="Conversion" 
                  value={stats.totalOrders.toLocaleString()} 
                  sub="Closed deals"
                  percent={stats.visitors > 0 ? (stats.totalOrders / stats.visitors) * 100 : 0}
                  color="bg-primary"
                />
              </div>
              
              <div className="mt-8 pt-5 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overall Yield</span>
                  <span className="text-lg font-semibold">{stats.conversionRate.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Intelligence Side - 4 cols */}
        <div className="xl:col-span-4 space-y-5">
                  
          {/* AI Impact - High Prominence Card */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">AI impact</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">How autonomous conversations and negotiation flows are shaping commerce outcomes.</p>
                </div>
                <Badge variant="secondary" className="rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Live signals
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 lg:p-6">
              <ImpactMetric
                icon={ShoppingBag}
                label="AI-assisted orders"
                value={stats.aiAssistedOrders.toString()}
                detail={stats.totalOrders > 0 ? `${((stats.aiAssistedOrders / stats.totalOrders) * 100).toFixed(1)}% of all orders` : 'Waiting on more volume'}
              />
              <ImpactMetric
                icon={DollarSign}
                label="Revenue uplift"
                value={formatCurrency(stats.aiRevenueDelta, merchant?.currency, merchant?.locale)}
                detail="Sales shaped by AI assistance"
              />
              <ImpactMetric
                icon={Handshake}
                label="Price Locks"
                value={stats.bargainedOrders.toString()}
                detail="Negotiations converted into orders"
              />
              
              <div className="mt-2 rounded-[20px] border border-border/70 bg-secondary/20 p-5">
                <div className="flex items-center justify-between text-xs font-semibold mb-3">
                  <span className="text-muted-foreground uppercase tracking-widest">Automation efficiency</span>
                  <span className="text-foreground">{((stats.aiAssistedOrders / Math.max(stats.totalOrders, 1)) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-border/50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(stats.aiAssistedOrders / Math.max(stats.totalOrders, 1)) * 100}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketing & Discounts */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6">
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold tracking-tight">Marketing Impact</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 lg:p-6 space-y-3">
              {topDiscounts.length > 0 ? (
                topDiscounts.map((discount, idx) => (
                  <div key={idx} className="flex items-center justify-between group rounded-[18px] border border-border/70 bg-secondary/15 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background border border-border/70">
                        <Percent className="h-4 w-4 text-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold tracking-tight uppercase">{discount.code}</div>
                        <div className="text-[11px] text-muted-foreground">{discount.count} usage events</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-foreground">-{formatCurrency(discount.amount, merchant?.currency, merchant?.locale)}</div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Tag className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground italic">No active codes triggered yet.</p>
                </div>
              )}

              <div className="pt-4 mt-2 border-t border-border/70 flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Total Retention Cost</span>
                <span className="text-base font-semibold text-foreground">
                  {formatCurrency(stats.totalDiscounts + stats.totalBargainSavings, merchant?.currency, merchant?.locale)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Insights Table-ish Card */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight">Pulse Checks</CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-5 space-y-2.5">
                <InsightItem 
                  label="Visitor Conversion" 
                  value={`${stats.conversionRate.toFixed(2)}%`}
                  status={stats.conversionRate > 2 ? 'success' : 'neutral'}
                />
                <InsightItem 
                  label="Deal Velocity" 
                  value={stats.totalOrders > 0 ? `${(stats.totalOrders / (chartData.length || 1)).toFixed(1)}/day` : '0'}
                  status="neutral"
                />
                <InsightItem 
                  label="AI Capture" 
                  value={`${((stats.aiAssistedOrders / Math.max(stats.totalOrders, 1)) * 100).toFixed(0)}%`}
                  status="success"
                />
                <InsightItem 
                  label="Best Channel" 
                  value="Web Native"
                  status="neutral"
                />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bargain Leaderboard - Full Width */}
      <div className="mt-6">
        <Card className="overflow-hidden border-border/70 bg-card">
          <CardHeader className="border-b border-border/70 px-6 py-5 lg:px-8 lg:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Bargain Intelligence</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">High-conviction products seeing maximum AI negotiation activity.</p>
            </div>
            <div className="flex items-center gap-4 bg-secondary/20 p-2.5 rounded-2xl border border-border/70">
               <div className="px-4 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">Negotiated</div>
                  <div className="text-lg font-semibold text-foreground">{stats.bargainedOrders}</div>
               </div>
               <div className="w-px h-8 bg-border/70" />
               <div className="px-4 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">Saved</div>
                  <div className="text-lg font-semibold text-foreground">{formatCurrency(stats.totalBargainSavings, merchant?.currency, merchant?.locale)}</div>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topBargains.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="divide-y divide-border/70">
                    <div className="grid grid-cols-[1fr_120px_160px_140px] gap-4 px-8 py-3.5 bg-secondary/15 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">
                      <div>Product Portfolio</div>
                      <div className="text-right">Negotiations</div>
                      <div className="text-right">Efficiency</div>
                      <div className="text-right">Revenue Recovered</div>
                    </div>
                    {topBargains.map((bargain, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_120px_160px_140px] gap-4 px-8 py-4.5 items-center transition-colors hover:bg-secondary/25">
                        <div className="flex items-center gap-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-bold text-muted-foreground text-xs border border-border/70">
                            {idx + 1}
                          </div>
                          <span className="font-semibold text-foreground text-sm truncate">{bargain.productName}</span>
                        </div>
                        <div className="text-right text-sm text-muted-foreground font-medium">{bargain.count} sessions</div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-border/70 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                            {bargain.avgDiscount.toFixed(1)}% AVG
                          </Badge>
                        </div>
                        <div className="text-right font-semibold text-base tracking-tight">
                          {formatCurrency(bargain.totalSavings, merchant?.currency, merchant?.locale)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-[22px] bg-secondary flex items-center justify-center mb-6">
                  <Search className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <h3 className="text-base font-semibold">No Bargains Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  When customers start negotiating prices with your AI agent, details will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FunnelStep({ label, value, sub, percent, color }: { label: string; value: string; sub: string; percent: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground">{sub}</p>
      </div>
      <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border/70 bg-secondary/25 px-4.5 py-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function InsightItem({ label, value, status }: { label: string; value: string; status: 'success' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border/70 bg-secondary/20 px-3.5 py-2.5">
      <div className="text-[13px] font-medium text-foreground">{label}</div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight text-foreground">{value}</span>
        {status === 'success' && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
      </div>
    </div>
  );
}

function ImpactMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-secondary/20 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background border border-border/70">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  trend: number;
}) {
  const roundedTrend = Number.isFinite(trend) ? Number(trend.toFixed(1)) : 0;
  const trendTone =
    roundedTrend > 0
      ? 'bg-emerald-500/10 text-emerald-600'
      : roundedTrend < 0
        ? 'bg-red-500/10 text-red-500'
        : 'bg-secondary text-muted-foreground';

  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">{title}</p>
            <p className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary border border-border/70">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs leading-4 text-muted-foreground">{detail}</p>
          <Badge variant="secondary" className={`shrink-0 rounded-full border border-border/70 px-2.5 py-0.5 text-[10px] font-bold ${trendTone}`}>
            {roundedTrend > 0 ? '+' : ''}{roundedTrend.toFixed(1)}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
