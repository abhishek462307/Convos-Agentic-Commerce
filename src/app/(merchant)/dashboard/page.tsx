"use client"

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CreditCard,
  DollarSign,
  ExternalLink,
  Handshake,
  MessageSquare,
  Package,
  Palette,
  Plus,
  Rocket,
  ShoppingBag,
  Sparkles,
  Truck,
  TrendingUp,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useMerchant } from '@/hooks/use-merchant';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { AgentEventFeed } from '@/components/merchant/AgentEventFeed';
import type { MerchantDashboardSummary } from '@/types';

const DynamicSalesChart = dynamic(
  () => import('@/components/charts/SalesAreaChart').then((mod) => ({ default: mod.SalesAreaChart })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chart...</div> }
);

interface SetupTask {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  completed: boolean;
}

const setupTaskIcons: Record<string, React.ElementType> = {
  product: Package,
  branding: Palette,
  ai: Bot,
  payments: CreditCard,
  shipping: Truck,
  preview: ExternalLink,
};

const rangeOptions: Array<{ label: string; value: 1 | 7 | 30 }> = [
  { label: '1D', value: 1 },
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
];

function WelcomeBanner({
  storeName,
  tasks,
  completedCount,
  onDismiss,
}: {
  storeName: string;
  tasks: SetupTask[];
  completedCount: number;
  onDismiss: () => void;
}) {
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="mb-6"
    >
      <Card className="overflow-hidden border-border/70 bg-card">
        <div className="grid gap-6 p-6 lg:grid-cols-[0.88fr_1.12fr] lg:p-7">
          <div className="rounded-[24px] border border-border/70 bg-[linear-gradient(140deg,rgba(15,23,42,0.98),rgba(34,47,62,0.92))] p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Launch checklist</p>
                  <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-white">Get {storeName} selling smoothly</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/72">
                  Wrap the core setup tasks so the merchant panel, storefront, and AI workflows all feel production-ready.
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/75 transition-colors hover:bg-white/18 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between text-xs font-medium text-white/72">
                <span>{completedCount} completed</span>
                <span>{tasks.length} total tasks</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8dd4a7,#d9f99d)]"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={task.href}
                className={`rounded-[22px] border p-4 transition-all ${
                  task.completed
                    ? 'border-border/60 bg-secondary/35 text-muted-foreground'
                    : 'border-border/80 bg-background shadow-[0_12px_30px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      task.completed ? 'bg-secondary text-muted-foreground' : 'bg-secondary text-foreground'
                    }`}
                  >
                    {task.completed ? <CheckCircle2 className="h-4 w-4" /> : <task.icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function SearchParamsHandler({ onWelcome }: { onWelcome: (isWelcome: boolean) => void }) {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';

  useEffect(() => {
    if (isWelcome) {
      onWelcome(true);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [isWelcome, onWelcome]);

  return null;
}

export default function DashboardPage() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({ revenue: 0, orders: 0, conversations: 0, conversionRate: 0 });
  const [trends, setTrends] = useState({ revenue: 0, orders: 0, conversations: 0, conversionRate: 0 });
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [setupTasks, setSetupTasks] = useState<SetupTask[]>([]);
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [dateRangeDays, setDateRangeDays] = useState<1 | 7 | 30>(7);

  const { merchant } = useMerchant();

  useEffect(() => {
    const dismissed = localStorage.getItem('welcome_dismissed');
    if (!dismissed && merchant?.created_at) {
      const daysSince = (Date.now() - new Date(merchant.created_at).getTime()) / (1000 * 86400);
      if (daysSince < 7) {
        setShowWelcome(true);
      }
    }
  }, [merchant]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    if (!merchant) {
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/merchant/dashboard?days=${dateRangeDays}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      setLoading(false);
      return;
    }

    const data = (await response.json()) as MerchantDashboardSummary;

    setChartData(data.chartData || []);
    setStats(data.stats);
    setTrends(data.trends);
    setRecentConversations(data.recentConversations || []);
    setRecentOrders(data.recentOrders || []);
    setProductCount(data.productCount || 0);
    setLowStockCount(data.lowStockCount || 0);
    setAiMetrics(data.aiMetrics || null);
    setSetupTasks(
      (data.setupTasks || []).map((task) => ({
        ...task,
        icon: setupTaskIcons[task.id] || Package,
      }))
    );
    setLoading(false);
  }, [dateRangeDays, merchant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  const completedTasks = setupTasks.filter((task) => task.completed).length;
  const pendingTasks = setupTasks.filter((task) => !task.completed);
  const currency = merchant?.currency;
  const locale = merchant?.locale;

  const aiAssistedOrders = Number(aiMetrics?.orders_ai_assisted) || 0;
  const aiAssistRate = Number(aiMetrics?.ai_assist_rate) || 0;
  const aiOrdersTotal = Number(aiMetrics?.orders_total) || 0;
  const influencedRevenue = Number(aiMetrics?.revenue_influenced) || 0;
  const negotiationsCompleted = Number(aiMetrics?.negotiations_completed) || 0;
  const negotiatedOrders = Number(aiMetrics?.orders_ai_negotiated) || 0;
  const missionsCompleted = Number(aiMetrics?.missions_completed) || 0;
  const missionsActive = Number(aiMetrics?.missions_active) || 0;

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      <Suspense fallback={null}>
        <SearchParamsHandler onWelcome={setShowWelcome} />
      </Suspense>

      <header className="page-header flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/85 shadow-sm mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Live commerce operations
            </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Watch revenue, AI activity, and storefront readiness from one calmer control surface for {merchant?.store_name}.
          </p>
        </div>

          <div className="flex flex-wrap items-center gap-4 xl:justify-end">
              <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border/70 bg-card p-1.5 shadow-sm">
                {rangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateRangeDays(option.value)}
                    className={`rounded-xl px-5 py-2.5 text-[11px] font-bold tracking-tight transition-all ${
                      dateRangeDays === option.value
                        ? 'bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                        : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Link href="/conversations">
                <Button variant="outline" className="h-11 rounded-2xl border-border/70 bg-card px-6 font-semibold tracking-tight shadow-sm hover:bg-secondary/40 transition-all">
                  <MessageSquare className="mr-2.5 h-4 w-4" />
                  Conversations
                </Button>
              </Link>
              <Link href="/products/new">
                <Button className="h-11 rounded-2xl px-7 font-semibold tracking-tight shadow-md hover:opacity-90 transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  Create product
                </Button>
              </Link>
          </div>
      </header>

      <AnimatePresence>
        {showWelcome ? (
          <WelcomeBanner
            key="welcome-banner"
            storeName={merchant?.store_name || 'Store'}
            tasks={setupTasks}
            completedCount={completedTasks}
            onDismiss={() => {
              setShowWelcome(false);
              localStorage.setItem('welcome_dismissed', 'true');
            }}
          />
        ) : null}
      </AnimatePresence>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.revenue, currency, locale)}
          detail="Gross sales in the selected range"
          icon={DollarSign}
          trend={trends.revenue}
        />
        <StatCard
          title="Orders"
          value={stats.orders.toString()}
          detail="Completed and active transactions"
          icon={ShoppingBag}
          trend={trends.orders}
        />
        <StatCard
          title="AI Sessions"
          value={stats.conversations.toString()}
          detail="Live assistant-led shopping chats"
          icon={MessageSquare}
          trend={trends.conversations}
        />
        <StatCard
          title="Conversion"
          value={`${stats.conversionRate.toFixed(1)}%`}
          detail="Sessions that turned into orders"
          icon={TrendingUp}
          trend={trends.conversionRate}
        />
      </div>

      <div className="mb-5 grid gap-3 xl:items-start xl:grid-cols-[minmax(0,1.75fr)_340px]">
        <div className="space-y-3">
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Sales performance</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">A cleaner view of what your store and AI agent generated over the last {dateRangeDays} days.</p>
                </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Net sales</p>
                      <p className="mt-1 text-[32px] font-semibold tracking-tight text-foreground">
                      {formatCurrency(stats.revenue, currency, locale)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs">
                    <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                    {formatTrend(trends.revenue)} vs prior period
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[280px] border-b border-border/70 px-3 py-3 sm:px-5 lg:px-6">
                <DynamicSalesChart data={chartData} />
              </div>
              <div className="grid gap-2.5 px-5 py-4 md:grid-cols-3 lg:px-6">
                <SummaryPill
                  label="Average order value"
                  value={stats.orders > 0 ? formatCurrency(stats.revenue / stats.orders, currency, locale) : formatCurrency(0, currency, locale)}
                />
                <SummaryPill label="Products live" value={productCount.toString()} />
                <SummaryPill label="Low stock alerts" value={lowStockCount.toString()} />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Commerce snapshot</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">A tighter read on store momentum, AI automation, and catalog readiness.</p>
                </div>
                <Link href="/analytics" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Open analytics
                </Link>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4 lg:p-6">
              <SnapshotMetric
                icon={ShoppingBag}
                label="Orders captured"
                value={stats.orders.toString()}
                detail={`Last ${dateRangeDays} days`}
              />
              <SnapshotMetric
                icon={Bot}
                label="AI assist rate"
                value={`${aiAssistRate}%`}
                detail={aiOrdersTotal > 0 ? `${aiAssistedOrders} AI-assisted orders` : 'No assisted orders yet'}
              />
              <SnapshotMetric
                icon={Bot}
                label="Active AI workflows"
                value={missionsActive.toString()}
                detail={`${missionsCompleted} completed`}
              />
              <SnapshotMetric
                icon={Package}
                label="Catalog health"
                value={lowStockCount > 0 ? lowStockCount.toString() : 'Good'}
                detail={lowStockCount > 0 ? 'Items need restocking' : `${productCount} live products`}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 px-4 py-3.5">
              <CardTitle className="text-sm font-semibold tracking-tight">Store pulse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 p-4">
              <InsightRow label="Orders in range" value={stats.orders.toString()} helper="Total transactions captured" />
              <InsightRow label="AI-assisted orders" value={aiAssistedOrders.toString()} helper={aiOrdersTotal > 0 ? `${aiAssistRate}% of all orders` : 'No AI-assisted orders yet'} />
              <InsightRow label="Active AI workflows" value={missionsActive.toString()} helper={`${missionsCompleted} completed workflows`} />
              <InsightRow label="Inventory watch" value={`${lowStockCount}`} helper={lowStockCount > 0 ? 'Products need restocking' : 'No low stock warnings'} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 px-4 py-3.5">
              <CardTitle className="text-sm font-semibold tracking-tight">Next moves</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 p-4">
              {pendingTasks.length > 0 ? (
                pendingTasks.slice(0, 4).map((task) => (
                  <Link
                    key={task.id}
                    href={task.href}
                    className="group flex items-center gap-3 rounded-[20px] border border-border/70 bg-secondary/25 px-4 py-3 transition-colors hover:bg-secondary/45"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background">
                      <task.icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))
              ) : (
                <>
                  <QuickLink href="/store-design" icon={Palette} label="Refine storefront" detail="Polish the buyer-facing experience" />
                  <QuickLink href={`/store/${merchant?.subdomain}`} icon={ExternalLink} label="Preview live store" detail="Open your current storefront" target="_blank" />
                  <QuickLink href="/discounts" icon={Rocket} label="Launch a promotion" detail="Create a new discount or campaign" />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {aiMetrics ? (
        <Card className="mb-5 overflow-hidden border-border/70 bg-card">
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
          <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4 lg:p-6">
            <ImpactMetric
              icon={ShoppingBag}
              label="AI-assisted orders"
              value={aiAssistedOrders.toString()}
              detail={aiOrdersTotal > 0 ? `${aiAssistRate}% of all orders` : 'Waiting on more volume'}
            />
            <ImpactMetric
              icon={DollarSign}
              label="Revenue influenced"
              value={formatCurrency(influencedRevenue, currency, locale)}
              detail="Sales shaped by AI assistance"
            />
            <ImpactMetric
              icon={Handshake}
              label="Negotiations completed"
              value={negotiationsCompleted.toString()}
              detail={`${negotiatedOrders} converted into orders`}
            />
            <ImpactMetric
              icon={Bot}
              label="AI throughput"
              value={(missionsCompleted + missionsActive).toString()}
              detail={`${missionsActive} active and ${missionsCompleted} completed`}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-5 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <AgentEventFeed />

        <Card className="overflow-hidden border-border/70 bg-card">
          <CardHeader className="border-b border-border/70 px-4 py-3.5">
            <CardTitle className="text-sm font-semibold tracking-tight">Operational highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-4">
            <HighlightCard
              href="/conversations"
              icon={Bot}
              title="AI conversion"
              detail={
                stats.conversations > 0
                  ? `${stats.conversations} session${stats.conversations === 1 ? '' : 's'} generated a ${stats.conversionRate.toFixed(1)}% conversion rate.`
                  : 'No AI sessions yet. Drive traffic into the assistant to start learning.'
              }
            />
            <HighlightCard
              href="/products"
              icon={Package}
              title="Catalog health"
              detail={
                lowStockCount > 0
                  ? `${lowStockCount} product${lowStockCount === 1 ? '' : 's'} are low on stock across ${productCount} active SKUs.`
                  : `Catalog is stable with ${productCount} live product${productCount === 1 ? '' : 's'}.`
              }
            />
            <HighlightCard
              href="/orders"
              icon={TrendingUp}
              title="Demand check"
              detail={
                stats.orders > 0
                  ? `${stats.orders} order${stats.orders === 1 ? '' : 's'} arrived in the selected window.`
                  : 'No orders yet in this period. Consider a promotion or refreshed traffic source.'
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card className="overflow-hidden border-border/70 bg-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
            <CardTitle className="text-base font-semibold tracking-tight">Recent orders</CardTitle>
            <Link href="/orders" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <EmptyPanel icon={ShoppingBag} title="No orders yet" detail="Once shoppers check out, the latest transactions will show up here." />
            ) : (
              <div className="divide-y divide-border/70">
                {recentOrders.map((order) => {
                  const orderStatus = order.status === 'completed' ? 'default' : 'secondary';

                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/25"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                          <ShoppingBag className="h-4 w-4 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{order.customer_info?.email || 'Guest'}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()} • Order #{order.id.slice(0, 6)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tracking-tight text-foreground">
                          {formatCurrency(order.total_amount, currency, locale)}
                        </p>
                        <Badge variant={orderStatus} className="mt-1.5 rounded-full capitalize">
                          {order.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 bg-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
            <CardTitle className="text-base font-semibold tracking-tight">Active AI sessions</CardTitle>
            <Link href="/conversations" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Open inbox
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentConversations.length === 0 ? (
              <EmptyPanel icon={MessageSquare} title="No active sessions" detail="Incoming assistant conversations will appear here as shoppers engage." />
            ) : (
              <div className="divide-y divide-border/70">
                {recentConversations.map((convo) => (
                  <Link
                    key={convo.id}
                    href="/conversations"
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/25"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                        <MessageSquare className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">Session {convo.id.slice(0, 8)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(convo.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full capitalize">
                      {convo.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border/70 bg-secondary/25 px-4.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-tight text-foreground">{value}</p>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs leading-4 text-muted-foreground">{detail}</p>
          <Badge variant="secondary" className={`shrink-0 rounded-full ${trendTone}`}>
            {formatTrend(roundedTrend)}
          </Badge>
        </div>
      </CardContent>
    </Card>
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
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail}</p>
    </div>
  );
}

function SnapshotMetric({
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
    <div className="rounded-[18px] border border-border/70 bg-secondary/20 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail}</p>
    </div>
  );
}

function InsightRow({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border/70 bg-secondary/20 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </div>
      <p className="shrink-0 text-base font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  detail,
  target,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  detail: string;
  target?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      className="group flex items-center gap-3 rounded-[18px] border border-border/70 bg-secondary/25 px-3.5 py-2.5 transition-colors hover:bg-secondary/45"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function HighlightCard({
  href,
  icon: Icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[20px] border border-border/70 bg-secondary/20 p-3.5 transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail}</p>
        </div>
      </div>
    </Link>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-secondary">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatTrend(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}
