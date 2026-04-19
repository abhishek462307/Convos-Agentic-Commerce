"use client"

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Filter, Loader2, RefreshCw, Search, Shield, XCircle } from 'lucide-react';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMerchant } from '@/hooks/use-merchant';
import { generateHumanSummary, getDecisionMeta, timeAgo } from '@/lib/decision-explainer';
import type { MerchantApprovalItem } from '@/types';
import { toast } from 'sonner';

export default function AIAuthorityApprovalsPage() {
  const { merchant, loading: merchantLoading } = useMerchant();
  const [approvals, setApprovals] = useState<MerchantApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    if (!merchant) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/merchant/approvals', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load approvals');
      }

      setApprovals(payload.approvals || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [merchant]);

  useEffect(() => {
    if (merchant) {
      void fetchApprovals();
    }
  }, [merchant, fetchApprovals]);

  const handleAction = async (approval: MerchantApprovalItem, action: 'approve' | 'reverse') => {
    if (!merchant) {
      return;
    }

    setPendingId(approval.id);

    try {
      const body = {
        kind: 'decision',
        decisionLogId: approval.decisionLogId,
        action,
      };

      const response = await fetch('/api/merchant/approvals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update approval');
      }

      setApprovals((prev) => prev.filter((item) => item.id !== approval.id));
      toast.success(action === 'approve' ? 'Approval confirmed' : 'Approval declined');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update approval');
    } finally {
      setPendingId(null);
    }
  };

  if (merchantLoading) {
    return <MerchantPageSkeleton />;
  }

  const filteredApprovals = approvals
    .filter((log) => {
      if (filterType) {
        if (log.decisionType !== filterType) return false;
      }

      if (!searchTerm) {
        return true;
      }

      const haystack = `${log.consumerEmail || ''} ${log.summary || ''} ${log.title || ''}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) =>
      sortNewestFirst
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  const decisionCount = approvals.length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-6">
      <div className="page-header flex-col md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Approvals</span>
          </div>
          <h1 className="page-title">AI Approval Queue</h1>
          <p className="page-desc">Review and approve AI actions that require manual confirmation.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchApprovals()} disabled={loading} className="h-9 rounded-md px-4">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Pending approvals</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{approvals.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Items currently waiting for a merchant decision.</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Decision approvals</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{decisionCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">AI decisions currently waiting for explicit approval.</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Decision overrides</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{decisionCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">AI actions that paused for human confirmation.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 rounded-xl border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by email or summary"
                  className="h-9 pl-9"
                />
              </div>
              <Button
                variant="outline"
                className="h-9 rounded-md"
                onClick={() => setSortNewestFirst((value) => !value)}
              >
                {sortNewestFirst ? 'Newest First' : 'Oldest First'}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Button
                variant={filterType === null ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 rounded-md px-3 text-xs font-medium"
                onClick={() => setFilterType(null)}
              >
                All
              </Button>
              {['refund_rejected', 'loyalty_reward', 'discount_rejected', 'shipping_selected'].map((type) => {
                const meta = getDecisionMeta(type);
                const Icon = meta.icon;
                return (
                  <Button
                    key={type}
                    variant={filterType === type ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 rounded-md px-3 text-xs font-medium"
                    onClick={() => setFilterType(filterType === type ? null : type)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No pending approvals.
            </CardContent>
          </Card>
        ) : (
          filteredApprovals.map((log) => {
            const meta = getDecisionMeta(log.decisionType || 'discount_rejected');
            const Icon = meta.icon;
            const summary = log.summary || generateHumanSummary(log as never);

            return (
              <Card key={log.id} className="rounded-xl border border-border bg-card shadow-sm">
                <CardHeader className="border-b border-border bg-muted/30 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.color} border-current/20 bg-current/5`}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                      {log.consumerEmail && (
                        <span className="max-w-[220px] truncate text-[11px] text-muted-foreground">
                          {log.consumerEmail}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(log.createdAt)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <p className="text-sm leading-relaxed text-foreground">
                    &ldquo;{summary}&rdquo;
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-9 rounded-md px-3 text-xs font-medium"
                      onClick={() => void handleAction(log, 'approve')}
                      disabled={pendingId === log.id}
                    >
                      {pendingId === log.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-md px-3 text-xs font-medium"
                      onClick={() => void handleAction(log, 'reverse')}
                      disabled={pendingId === log.id}
                    >
                      <XCircle className="mr-2 h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
