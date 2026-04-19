"use client"

import { useState, useEffect, useCallback } from 'react';
import { Shield, Brain, Save, Loader2, Activity, Sparkles, RefreshCcw, Gift, Truck, CheckCircle2, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIAuthorityCard } from '@/components/ai-authority-card';
import { AIDecisionLog } from '@/components/ai-decision-log';
import { useMerchant } from '@/hooks/use-merchant';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { generateHumanSummary, getDecisionMeta, timeAgo } from '@/lib/decision-explainer';
import type { MerchantApprovalItem } from '@/types';

type PolicyLevel = 'autonomous' | 'approval_required' | 'disabled';

interface PolicyState {
  refund: PolicyLevel;
  maxRefund: number;
  loyalty: PolicyLevel;
  shipping: PolicyLevel;
}

export default function AIAuthorityPage() {
  const { merchant, loading: merchantLoading, refetch } = useMerchant();
  const [policies, setPolicies] = useState<PolicyState>({
    refund: 'approval_required',
    maxRefund: 50,
    loyalty: 'autonomous',
    shipping: 'autonomous',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  
  // Approvals State
  const [approvals, setApprovals] = useState<MerchantApprovalItem[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (merchant) {
      setPolicies({
        refund: (merchant.ai_refund_policy || 'approval_required') as PolicyLevel,
        maxRefund: merchant.ai_max_refund_amount || 50,
        loyalty: (merchant.ai_loyalty_policy || 'autonomous') as PolicyLevel,
        shipping: (merchant.ai_shipping_policy || 'autonomous') as PolicyLevel,
      });
    }
  }, [merchant]);

  const [currentPage, setCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 10;

  const fetchLogs = useCallback(async () => {
    if (!merchant) return;
    const { data } = await supabase
      .from('ai_decision_log')
      .select('*')
      .eq('merchant_id', merchant.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    if (data) {
      setRecentLogs(data);
    }
  }, [merchant]);

  const totalPages = Math.ceil(recentLogs.length / LOGS_PER_PAGE);
  const paginatedLogs = recentLogs.slice(
    (currentPage - 1) * LOGS_PER_PAGE,
    currentPage * LOGS_PER_PAGE
  );

  const fetchApprovals = useCallback(async () => {
    if (!merchant) return;
    setLoadingApprovals(true);
    try {
      const response = await fetch('/api/merchant/approvals', { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to load approvals');
      setApprovals(payload.approvals || []);
    } catch {
    } finally {
      setLoadingApprovals(false);
    }
  }, [merchant]);

  useEffect(() => {
    if (merchant) {
      void fetchLogs();
      void fetchApprovals();
    }
  }, [merchant, fetchLogs, fetchApprovals]);

  const handleAction = async (approval: MerchantApprovalItem, action: 'approve' | 'reverse') => {
    if (!merchant) return;
    
    // Set pending state to show loading spinner
    setPendingId(approval.id);
    
    try {
      const body = {
        kind: 'decision',
        action,
        decisionLogId: approval.decisionLogId || approval.id.replace('decision:', ''),
      };

      const response = await fetch('/api/merchant/approvals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Something went wrong');
      }

      // Remove the item from the list and show success
      setApprovals((prev) => prev.filter((item) => item.id !== approval.id));
      toast.success(action === 'approve' ? 'Approved' : 'Declined');
      
      // Refresh the log after a short delay to show the new status
      setTimeout(() => {
        void fetchLogs();
      }, 800);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update');
    } finally {
      setPendingId(null);
    }
  };

  const handleSave = async () => {
    if (!merchant) return;
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch('/api/merchant/settings/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            ai_refund_policy: policies.refund,
            ai_max_refund_amount: policies.maxRefund,
            ai_loyalty_policy: policies.loyalty,
            ai_shipping_policy: policies.shipping,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to save policies');
      setSaved(true);
      toast.success('Policies saved');
      refetch();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Failed to save policies');
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading) return <MerchantPageSkeleton />;

  const autonomousCount = [
    policies.refund,
    policies.loyalty,
    policies.shipping,
  ].filter(p => p === 'autonomous').length;

  const flaggedCount = recentLogs.filter(l => 
    l.outcome?.reason === 'requires_approval' || 
    ['refund_rejected', 'discount_rejected'].includes(l.decision_type)
  ).length;

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="page-header flex-col gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">AI Rules & Trust</span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">AI Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Choose how much the AI can do on its own and review any actions that need your okay.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              void fetchApprovals();
              void fetchLogs();
            }}
            disabled={loadingApprovals}
            className="h-10 rounded-2xl border-border/70 px-4"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingApprovals ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-10 rounded-2xl px-5 font-semibold"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
          </Button>
        </div>
      </header>

      {/* ── Overview Stats ────────────────────────────────────────────────── */}
      <div className="mb-8 mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Automatic Actions"
          value={`${autonomousCount}/3`}
          detail="Things the AI handles on its own"
          icon={Brain}
        />
        <StatCard
          title="Needs Review"
          value={approvals.length.toString()}
          detail="Things waiting for you to check"
          icon={Shield}
        />
        <StatCard
          title="AI Actions"
          value={recentLogs.length.toString()}
          detail="Things the AI did this month"
          icon={Activity}
        />
        <StatCard
          title="Paused Actions"
          value={flaggedCount.toString()}
          detail="Things the AI asked you about"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* ── Left Column: Live Activity & Queue ──────────────────────────── */}
        <div className="space-y-8">
          {/* Approval Queue Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Shield className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Waiting for your okay</h3>
                {approvals.length > 0 && (
                  <Badge className="h-5 rounded-full bg-emerald-500 px-2 text-[10px] font-bold text-white">
                    {approvals.length} waiting
                  </Badge>
                )}
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {approvals.length === 0 ? (
                !loadingApprovals && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="border-dashed border-border/70 bg-secondary/5">
                      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-secondary/40">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-foreground">Everything is running</p>
                        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                          Your review list is clear. The AI is helping customers based on your rules.
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                )
              ) : (
                <div className="grid gap-3">
                  {approvals.map((log) => {
                    const meta = { ...getDecisionMeta(log.decisionType || 'discount_rejected'), bg: 'bg-current/5' };
                    const Icon = meta.icon;
                    const summary = log.summary || generateHumanSummary(log as never);

                    return (
                      <motion.div
                        key={log.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="overflow-hidden border-border/70 bg-card hover:border-border/100 transition-colors">
                          <CardHeader className="border-b border-border/70 bg-card px-5 py-3.5">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex min-w-0 flex-wrap items-center gap-3">
                                <Badge 
                                  variant="outline" 
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-tight ${meta.color} border-current/20 ${meta.bg || 'bg-current/5'}`}
                                >
                                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                                  {meta.label.toUpperCase()}
                                </Badge>
                                {log.consumerEmail && (
                                  <div className="flex items-center gap-2">
                                    <div className="h-1 w-1 rounded-full bg-border/70" />
                                    <span className="truncate text-[13px] font-medium text-muted-foreground">
                                      {log.consumerEmail}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className="shrink-0 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                {timeAgo(log.createdAt)}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="p-5">
                            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary/50">
                                    <Sparkles className="h-4 w-4 text-foreground" />
                                  </div>
                                  <p className="text-[14px] leading-7 text-foreground font-medium">
                                    &ldquo;{summary}&rdquo;
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    className="h-10 rounded-2xl px-5 text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    onClick={() => void handleAction(log, 'approve')}
                                    disabled={pendingId === log.id}
                                  >
                                    {pendingId === log.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 rounded-2xl px-5 text-sm font-semibold border-border/70 transition-all hover:bg-secondary/50"
                                    onClick={() => void handleAction(log, 'reverse')}
                                    disabled={pendingId === log.id}
                                  >
                                    Decline
                                  </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </section>

          {/* Activity Log Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">What the AI has done</h3>
            </div>
            <AIDecisionLog logs={paginatedLogs} defaultOpen merchantId={merchant?.id} />
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 bg-muted/5 px-4 py-3 rounded-xl border border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Showing {(currentPage - 1) * LOGS_PER_PAGE + 1}-{Math.min(currentPage * LOGS_PER_PAGE, recentLogs.length)} of {recentLogs.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-7 w-7 rounded-lg text-[10px] font-bold transition-colors ${
                            currentPage === pageNum 
                              ? 'bg-foreground text-background' 
                              : 'text-muted-foreground hover:bg-secondary/50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right Column: Policy Controls ────────────────────────────────── */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <Brain className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">AI Rules</h3>
            </div>

            <div className="space-y-4">
              <AIAuthorityCard
                icon={RefreshCcw}
                title="Refunds"
                description="The AI handles refund requests"
                policy={policies.refund}
                onPolicyChange={(p) => setPolicies(prev => ({ ...prev, refund: p }))}
                maxAmount={policies.maxRefund}
                onMaxAmountChange={(v) => setPolicies(prev => ({ ...prev, maxRefund: v }))}
                maxAmountLabel="Max Refund"
                maxAmountPrefix="$"
                showTrustThreshold
              />
              <AIAuthorityCard
                icon={Gift}
                title="Loyalty & Rewards"
                description="The AI gives out discount codes and gifts"
                policy={policies.loyalty}
                onPolicyChange={(p) => setPolicies(prev => ({ ...prev, loyalty: p }))}
              />
              <AIAuthorityCard
                icon={Truck}
                title="Shipping"
                description="The AI chooses how to ship orders"
                policy={policies.shipping}
                onPolicyChange={(p) => setPolicies(prev => ({ ...prev, shipping: p }))}
              />
            </div>

            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 px-4 py-3.5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Health</h4>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border/70 bg-secondary/20 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">AI Success Rate</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Actions the AI did without help</p>
                  </div>
                  <p className="shrink-0 text-base font-bold tracking-tight text-foreground">94%</p>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border/70 bg-secondary/20 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">AI Speed</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">How fast the AI thinks</p>
                  </div>
                  <p className="shrink-0 text-base font-bold tracking-tight text-foreground">1.2s</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
            <p className="mt-2.5 text-[28px] font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs leading-4 text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
