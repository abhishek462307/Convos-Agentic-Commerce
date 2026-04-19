"use client"

import { useEffect, useState, type MouseEvent } from 'react';
import { Brain, ChevronDown, Filter, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getDecisionMeta, generateHumanSummary, formatDecisionFactors, timeAgo } from '@/lib/decision-explainer';
import { toast } from 'sonner';

interface DecisionLog {
  id: string;
  decision_type: string;
  summary?: string;
  human_summary?: string;
  factors?: Record<string, any>;
  outcome?: Record<string, any>;
  consumer_email?: string;
  created_at: string;
  tool_called?: string;
  override_status?: string | null;
  channel?: string;
}

interface AIDecisionLogProps {
  logs: DecisionLog[];
  defaultOpen?: boolean;
  merchantId?: string;
  loading?: boolean;
}

export function AIDecisionLog({ logs, defaultOpen = false, merchantId, loading = false }: AIDecisionLogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<DecisionLog[]>(logs || []);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  useEffect(() => {
    setLocalLogs(logs || []);
  }, [logs]);

  const handleDecisionAction = async (event: MouseEvent, log: DecisionLog, action: 'approve' | 'reverse') => {
    event.stopPropagation();

    const pendingKey = `${log.id}:${action}`;
    setPendingActionId(pendingKey);

    try {
      const response = await fetch('/api/merchant/approvals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'decision',
          decisionLogId: log.id,
          action,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update decision');
      }

      setLocalLogs((prev) => prev.map((entry) => (
        entry.id === log.id
          ? { ...entry, override_status: action === 'approve' ? 'approved' : 'reversed' }
          : entry
      )));
      toast.success(action === 'approve' ? 'Decision approved' : 'Decision declined');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update decision');
    } finally {
      setPendingActionId(null);
    }
  };

  if (loading) {
    return (
      <Card className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <CardHeader className="border-b border-border/70 bg-muted/20 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/50">
              <Brain className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">AI Decisions</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Loading your latest AI activity.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-3 px-6 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Pulling the last 30 days of decision history.
        </CardContent>
      </Card>
    );
  }

  if (!localLogs || localLogs.length === 0) {
    return (
      <Card className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <CardHeader className="border-b border-border/70 bg-muted/20 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/50">
              <Brain className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">AI Decisions</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">No logged actions yet.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6 text-sm text-muted-foreground">
          Once the agent starts approving offers, refunds, or shipping choices, the activity stream will appear here.
        </CardContent>
      </Card>
    );
  }

  const decisionTypes = [...new Set(localLogs.map(l => l.decision_type))];
  const filtered = filter ? localLogs.filter(l => l.decision_type === filter) : localLogs;

  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer border-b border-border bg-muted/30 px-6 py-5 transition-colors hover:bg-muted/40">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                  <Brain className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">AI Decisions</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {localLogs.length} logged {localLogs.length === 1 ? 'action' : 'actions'}
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            {decisionTypes.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-4">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Button
                  variant={filter === null ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs font-medium"
                  onClick={() => setFilter(null)}
                >
                  All
                </Button>
                {decisionTypes.map(type => {
                  const meta = getDecisionMeta(type);
                  const Icon = meta.icon;
                  return (
                    <Button
                      key={type}
                      variant={filter === type ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 rounded-md px-3 text-xs font-medium"
                      onClick={() => setFilter(filter === type ? null : type)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </Button>
                  );
                })}
              </div>
            )}
            <div className="divide-y divide-border">
              {filtered.map(log => {
                const meta = getDecisionMeta(log.decision_type);
                const Icon = meta.icon;
                const summary = log.human_summary || generateHumanSummary(log);
                const factors = formatDecisionFactors(log.factors || {});
                const isExpanded = expandedId === log.id;

                return (
                  <div
                    key={log.id}
                    className="cursor-pointer px-6 py-4 transition-colors hover:bg-muted/30"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.color} border-current/20 bg-current/5`}>
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </Badge>
                            {log.channel && (
                              <Badge variant="outline" className={`rounded-md border px-1.5 py-0 text-[10px] font-medium ${
                                log.channel === 'mcp' ? 'text-purple-400 border-purple-400/20 bg-purple-400/5' :
                                log.channel === 'whatsapp' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' :
                                'border-border bg-background text-muted-foreground'
                              }`}>
                                {log.channel}
                              </Badge>
                            )}
                            {log.consumer_email && (
                              <span className="max-w-[200px] truncate text-[11px] text-muted-foreground">
                                {log.consumer_email}
                              </span>
                            )}

                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          &ldquo;{summary}&rdquo;
                        </p>
                      </div>
                      <span className="mt-1 whitespace-nowrap text-[11px] text-muted-foreground">
                        {timeAgo(log.created_at)}
                      </span>
                    </div>

                    {isExpanded && factors.length > 0 && (
                      <div className="mt-4 pl-0 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Factors</p>
                        <div className="flex flex-wrap gap-2">
                          {factors.map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs">
                              <span className="text-muted-foreground">{f.label}:</span>
                              <span className="font-medium text-foreground">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {isExpanded && merchantId && !log.override_status && (
                      (() => {
                        const isRefundApproval = log.decision_type === 'refund_rejected' && log.factors?.refund_policy === 'approval_required';
                        const isLoyaltyApproval = log.decision_type === 'loyalty_reward' && log.outcome?.reason === 'requires_approval';
                        const isDiscountApproval = log.decision_type === 'discount_rejected' && log.outcome?.reason === 'requires_approval';
                        const isShippingApproval = log.decision_type === 'shipping_selected' && log.outcome?.reason === 'requires_approval';
                        if (!isRefundApproval && !isLoyaltyApproval && !isDiscountApproval && !isShippingApproval) return null;
                        return (
                          <div className="mt-4 flex items-center gap-2">
                            <Button
                              size="sm"
                              className="h-8 rounded-md px-3 text-xs font-medium"
                              disabled={pendingActionId !== null}
                              onClick={(event) => void handleDecisionAction(event, log, 'approve')}
                            >
                              {pendingActionId === `${log.id}:approve` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-md px-3 text-xs font-medium"
                              disabled={pendingActionId !== null}
                              onClick={(event) => void handleDecisionAction(event, log, 'reverse')}
                            >
                              {pendingActionId === `${log.id}:reverse` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                              Decline
                            </Button>
                          </div>
                        );
                      })()
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
