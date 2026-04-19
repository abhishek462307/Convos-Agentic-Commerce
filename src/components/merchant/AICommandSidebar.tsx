"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { AssistantTranscript } from '@/components/merchant/AssistantTranscript';
import type {
  MerchantAgentMessage,
  MerchantAgentMessageAction,
  MerchantAgentThreadDetail,
  MerchantAgentThreadSummary,
  MerchantContext,
} from '@/types';
import { toast } from 'sonner';

const QUICK_ACTIONS = [
  'What needs attention today?',
  "Show me today's orders",
  'What products are low on stock?',
  'What should I improve this week?',
  'Review this page and tell me what to fix',
];

function FaviconAvatar({ size = 8 }: { size?: number }) {
  const px = size * 4;
  return (
    <div className="overflow-hidden rounded-full shadow-[0_0_10px_rgba(168,85,247,0.35)]">
      <Image src="/convos-avatar.png" alt="Assistant" width={px} height={px} className="h-full w-full object-cover scale-[1.13]" />
    </div>
  );
}

function getThreadStatusText(thread: MerchantAgentThreadSummary | MerchantAgentThreadDetail | null) {
  if (!thread) return 'Loading';
  if (thread.status === 'active') return 'Working';
  if (thread.status === 'needs_approval') return 'Needs confirmation';
  if (thread.status === 'waiting') return 'Waiting';
  return 'Ready';
}

function getRouteLabel(pathname: string | null) {
  if (!pathname) return 'merchant panel';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/products')) return 'products';
  if (pathname.startsWith('/customers')) return 'customers';
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/marketing')) return 'marketing';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/conversations')) return 'conversations';
  return 'merchant panel';
}

export function AICommandSidebar({
  merchant,
  open,
  onOpenChange,
  theme = 'dark',
}: {
  merchant: any
  merchantContext?: MerchantContext | null
  open: boolean
  onOpenChange: (open: boolean) => void
  theme?: 'dark' | 'light'
}) {
  const isLight = theme === 'light';
  const router = useRouter();
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [threads, setThreads] = useState<MerchantAgentThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<MerchantAgentThreadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pendingMessage, setPendingMessage] = useState<{ threadId: string; message: MerchantAgentMessage } | null>(null);
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);
  const ensureActiveThreadId = useCallback(async () => {
    if (selectedThreadId) {
      return selectedThreadId;
    }

    const response = await fetch('/api/merchant/assistant/threads', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to prepare assistant thread');
    }

    const payload = await response.json().catch(() => ({}));
    const nextThreads = payload.threads || [];
    const resolvedThreadId = payload.activeThreadId || payload.mainThreadId || nextThreads[0]?.id || null;

    setThreads(nextThreads);

    if (resolvedThreadId) {
      setSelectedThreadId(resolvedThreadId);
    }

    return resolvedThreadId;
  }, [selectedThreadId]);

  const loadThreads = useCallback(async () => {
    const response = await fetch('/api/merchant/assistant/threads', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to load assistant threads');
    }
    const payload = await response.json().catch(() => ({}));
    const nextThreads = payload.threads || [];
    setThreads(nextThreads);
    setSelectedThreadId((current) => (
      current && nextThreads.some((thread: MerchantAgentThreadSummary) => thread.id === current)
        ? current
        : payload.activeThreadId || nextThreads[0]?.id || null
    ));
  }, []);

  const loadThreadDetail = useCallback(async (threadId: string) => {
    const response = await fetch(`/api/merchant/assistant/threads/${threadId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to load assistant thread');
    }
    const payload = await response.json().catch(() => ({}));
    setSelectedThread(payload.thread || null);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        await loadThreads();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load assistant');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    const channel = supabase
      .channel('merchant-assistant-sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merchant_agent_threads' }, () => { void loadThreads(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'merchant_agent_messages' }, () => { void loadThreads(); })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [loadThreads, open]);

  useEffect(() => {
    if (!open || !selectedThreadId) return;
    let cancelled = false;

    const load = async () => {
      try {
        await loadThreadDetail(selectedThreadId);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load assistant thread');
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadThreadDetail, open, selectedThreadId]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThread?.messages.length, sending, pendingMessage?.message.id]);

  const selectedThreadSummary = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads],
  );
  const routeLabel = getRouteLabel(pathname);
  const statusText = sending ? 'Working' : getThreadStatusText(selectedThreadSummary || selectedThread);

  const sendMessage = useCallback(async (overrideText?: string, actionPayload?: Record<string, unknown> | null) => {
    const text = (overrideText || input).trim();
    if (!text || sending) return;

    let activeThreadId: string | null = null;
    const draft = text;

    try {
      activeThreadId = selectedThreadId || await ensureActiveThreadId();
      if (!activeThreadId) {
        throw new Error('No assistant thread is available yet');
      }

      setSending(true);
      setLastActionLabel(actionPayload ? 'Running action' : 'Thinking');
      setPendingMessage({
        threadId: activeThreadId,
        message: {
          id: `pending-${Date.now()}`,
          role: 'user',
          messageType: 'chat',
          content: draft,
          createdAt: new Date().toISOString(),
          actions: [],
          metadata: null,
        },
      });
      setInput('');
      const response = await fetch(`/api/merchant/assistant/threads/${activeThreadId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          routeContext: `merchant is on page: ${pathname}`,
          actionPayload: actionPayload || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send message');
      }

      if (payload.thread) {
        setSelectedThread(payload.thread);
      }
      if (payload.focusThreadId) {
        setSelectedThreadId(payload.focusThreadId);
      }
      await loadThreads();

      if (payload.navigateTo) {
        router.push(payload.navigateTo);
        onOpenChange(false);
      }
    } catch (error) {
      setInput(draft);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setPendingMessage((current) => (current?.threadId === activeThreadId ? null : current));
      setSending(false);
      setLastActionLabel(null);
    }
  }, [ensureActiveThreadId, input, loadThreads, onOpenChange, pathname, router, selectedThreadId, sending]);

  const handleAction = useCallback(async (action: MerchantAgentMessageAction) => {
    if (!selectedThreadId) return;

    if (action.kind === 'send_prompt') {
      const payload = action.payload && typeof action.payload === 'object' ? action.payload : {};
      const text = typeof payload.text === 'string' ? payload.text : action.label;
      const actionPayload = payload.actionPayload && typeof payload.actionPayload === 'object' && !Array.isArray(payload.actionPayload)
        ? payload.actionPayload as Record<string, unknown>
        : null;
      await sendMessage(text, actionPayload);
      return;
    }

    if (action.kind === 'approve' || action.kind === 'reject') {
      toast.error('This action is no longer supported here.');
      return;
    }

    if (action.kind === 'open_thread') {
      toast.error('Thread jumping is not available in this assistant.');
      return;
    }

    if (action.kind === 'open_mission') {
      toast.error('Mission links are not available in this assistant.');
      return;
    }

    if (action.kind === 'navigate') {
      const payload = action.payload && typeof action.payload === 'object' ? action.payload : {};
      if (typeof payload.path === 'string') {
        router.push(payload.path);
        onOpenChange(false);
      }
    }
  }, [onOpenChange, router, selectedThreadId, sendMessage]);

  const clearChat = () => {
    const mainThread = threads.find((thread) => thread.kind === 'main');
    if (mainThread) {
      setSelectedThreadId(mainThread.id);
    }
    setInput('');
  };

  const canDeleteAssistantMessage = useCallback((message: MerchantAgentMessage) => (
    message.role === 'assistant'
    && message.messageType !== 'approval_request'
    && !message.id.startsWith('pending-')
  ), []);

  const handleDeleteAssistantMessage = useCallback(async (message: MerchantAgentMessage) => {
    if (!selectedThreadId) {
      return;
    }

    if (!window.confirm('Delete this assistant message from the thread?')) {
      return;
    }

    try {
      setDeletingMessageId(message.id);
      const response = await fetch(`/api/merchant/assistant/threads/${selectedThreadId}/messages/${message.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete assistant message');
      }

      if (payload.thread) {
        setSelectedThread(payload.thread);
      }

      await loadThreads();
      toast.success('Assistant message deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete assistant message');
    } finally {
      setDeletingMessageId(null);
    }
  }, [loadThreads, selectedThreadId]);

  const showQuickActions = !input.trim() && !sending;
  const displayMessages = pendingMessage && pendingMessage.threadId === selectedThreadId
    ? [...(selectedThread?.messages || []), pendingMessage.message]
    : (selectedThread?.messages || []);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col sm:w-[420px]',
              isLight
                ? 'border-l border-border bg-[#fbfbf8] shadow-[-20px_0_60px_rgba(15,23,42,0.12)]'
                : 'border-l border-white/10 bg-[#0a0a0a] shadow-[-20px_0_60px_rgba(0,0,0,0.6)]'
            )}
          >
            <div className={cn(
              'flex shrink-0 items-center justify-between border-b px-5 py-4',
              isLight ? 'border-border' : 'border-white/10'
            )}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-8 w-8 shrink-0">
                  <FaviconAvatar size={8} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className={cn('truncate text-sm font-semibold', isLight ? 'text-foreground' : 'text-white')}>
                      {selectedThread?.title || 'Store Assistant'}
                    </h2>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={cn('text-[11px] font-medium', isLight ? 'text-purple-700' : 'text-purple-400')}>
                      {merchant.store_name}
                    </span>
                    <span className={cn(isLight ? 'text-border' : 'text-white/20')}>·</span>
                    <span className={cn('text-[10px]', isLight ? 'text-muted-foreground' : 'text-zinc-500')}>
                      {statusText} · {routeLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className={cn(
                    'rounded-lg p-2 transition-all',
                    isLight ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  )}
                  title="Back to main assistant thread"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    'rounded-lg p-2 transition-all',
                    isLight ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className={cn(
                'mb-4 rounded-2xl border px-4 py-3 text-[12px] leading-5',
                isLight ? 'border-border bg-background text-muted-foreground' : 'border-white/10 bg-white/5 text-zinc-300'
              )}>
                Ask about orders, catalog, customers, discounts, analytics, or this page. I’ll act in context and guide confirmations when needed.
                {lastActionLabel ? (
                  <span className="ml-2 inline-flex items-center gap-1 font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    {lastActionLabel}
                  </span>
                ) : null}
              </div>
              <AssistantTranscript
                messages={displayMessages}
                loading={loading || sending}
                theme={isLight ? 'light' : 'dark'}
                onAction={(action) => { void handleAction(action); }}
                onDeleteMessage={(message) => { void handleDeleteAssistantMessage(message); }}
                canDeleteMessage={canDeleteAssistantMessage}
                deletingMessageId={deletingMessageId}
                emptyTitle="Talk to your assistant"
                emptyDescription="Ask a question or give the assistant something to work on."
              />
              <div ref={messagesEndRef} />
            </div>

            {showQuickActions ? (
              <div className={cn(
                'shrink-0 border-t px-4 pb-3 pt-3',
                isLight ? 'border-border' : 'border-white/10'
              )}>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_ACTIONS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-left text-[11px] font-medium transition-all',
                        isLight
                          ? 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                          : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white'
                      )}
                    >
                      <span>{prompt}</span>
                      <ArrowRight className="mt-1 h-3.5 w-3.5 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={cn(
              'shrink-0 border-t px-4 pb-4 pt-2',
              isLight ? 'border-border' : 'border-white/10'
            )}>
              <div className={cn(
                'flex items-end gap-2 rounded-2xl border px-4 py-3 transition-colors',
                isLight
                  ? 'border-border bg-background focus-within:border-purple-500/30'
                  : 'border-white/10 bg-white/5 focus-within:border-purple-500/40'
              )}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={`Ask Convos to help with ${routeLabel}...`}
                  rows={1}
                  className={cn(
                    'max-h-32 flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none',
                    isLight ? 'text-foreground placeholder:text-muted-foreground' : 'text-white placeholder:text-zinc-500'
                  )}
                  style={{ minHeight: '24px' }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || sending}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-white" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                <span className={cn(isLight ? 'text-muted-foreground' : 'text-zinc-500')}>
                  Convos answers directly here and can take you to the right page when needed.
                </span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
