"use client"

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Bot,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useMerchant } from '@/hooks/use-merchant';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function getStatusBadgeClass(status: string | null | undefined) {
  if (status === 'active') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }

  if (status === 'ended') {
    return 'border-border/60 bg-secondary/50 text-muted-foreground';
  }

  return 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400';
}

function getChannelBadgeClass(channel: string | null | undefined) {
  if (channel === 'whatsapp') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }

  if (channel === 'mcp') {
    return 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400';
  }

  return 'border-border/60 bg-secondary/50 text-muted-foreground';
}

function getConversationLabel(conversation: Record<string, any>) {
  if (conversation.session_id) {
    return String(conversation.session_id).replace(/^session_/, 'session ');
  }

  return conversation.id.slice(0, 8).toUpperCase();
}

function ConversationsContent() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { merchant } = useMerchant();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const itemsPerPage = 20;
  const liveSessions = conversations.filter((conversation) => conversation.status === 'active').length;
  const totalPages = Math.ceil(totalConversations / itemsPerPage);

  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!merchant?.id) {
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(itemsPerPage),
        search: searchTerm,
      });

      try {
        const response = await fetch(`/api/merchant/conversations?${params.toString()}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setConversations([]);
          setTotalConversations(0);
          setError(payload.error || 'Failed to load conversations');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setConversations(data.items || []);
        setTotalConversations(data.total || 0);
        setLoading(false);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load conversations';
        setConversations([]);
        setTotalConversations(0);
        setError(message);
        setLoading(false);
      }
    };

    if (!merchant?.id) {
      return;
    }

    fetchConversations();

    const conversationsChannel = supabase
      .channel('merchant-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'storefront_conversations',
          filter: `merchant_id=eq.${merchant.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [currentPage, itemsPerPage, merchant?.id, searchTerm]);

  const fetchConversationDetail = useCallback(async (conversationId: string) => {
    if (!merchant?.id) {
      return;
    }

    setLoadingMessages(true);
    const response = await fetch(`/api/merchant/conversations/${conversationId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const data = await response.json();
    setMessages(data.messages || []);
    setLoadingMessages(false);
  }, [merchant?.id]);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    const messagesChannel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'storefront_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages((previous) => [...previous, payload.new as any]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenTranscript = (conversation: any) => {
    setSelectedConversation(conversation);
    fetchConversationDetail(conversation.id);
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      <header className="page-header mb-6 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard"
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground shadow-sm transition-colors hover:bg-secondary/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Customer Sessions
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Conversations</h1>
            <p className="page-desc mt-2 max-w-2xl">
              Monitor live storefront sessions, inspect conversation flow, and open a clean transcript-first view when you need context.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Badge variant="secondary" className="rounded-full border border-border/60 bg-secondary/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Realtime Enabled
          </Badge>
        </div>
      </header>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden border-border/70 bg-card">
          <CardContent className="grid gap-3 p-4 md:grid-cols-3 lg:p-5">
            <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Visible Sessions</p>
                  <p className="mt-3 text-[28px] font-semibold tracking-tight text-foreground">{totalConversations}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-foreground shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Active On Page</p>
                  <p className="mt-3 text-[28px] font-semibold tracking-tight text-foreground">{liveSessions}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-foreground shadow-sm">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Transcript Mode</p>
                  <p className="mt-3 text-sm font-semibold text-foreground">Cleaner review surface</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">AI decision traces stay out of this view so session review remains readable.</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-foreground shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 bg-card">
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">How This View Works</p>
              <p className="mt-3 text-sm font-semibold text-foreground">Search, scan, open transcript</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This page follows the Convos feed pattern: a clean operating surface up front, then a focused transcript in the side sheet.
              </p>
            </div>
            <div className="mt-5 rounded-[20px] border border-border/70 bg-secondary/30 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Best Use</p>
              <p className="mt-2 text-sm text-foreground">QA live sessions, review shopper intent, and spot assistant behavior without opening deeper analytics.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
        <CardHeader className="border-b border-border/70 bg-secondary/30 px-4 py-3 lg:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Session Inbox</p>
              <p className="mt-1 text-sm text-muted-foreground">Search by session id or status, then open the full transcript.</p>
            </div>
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <Input
                placeholder="Search sessions or status..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 rounded-xl border-border/70 bg-background pl-10 text-sm shadow-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="py-24 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-secondary/35">
                <X className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-foreground">Couldn&apos;t load conversations</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-32 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-secondary/35">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold text-foreground">No sessions yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Active storefront conversations will appear here in real time.</p>
            </div>
          ) : (
            <div className="space-y-3 p-3 lg:p-4">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleOpenTranscript(conversation)}
                  className="group block w-full rounded-[24px] border border-border/70 bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-secondary/20 hover:shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground">
                        <MessageSquare className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{getConversationLabel(conversation)}</p>
                          <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${getStatusBadgeClass(conversation.status)}`}>
                            {conversation.status || 'unknown'}
                          </Badge>
                          <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${getChannelBadgeClass(conversation.channel)}`}>
                            {conversation.channel || 'web'}
                          </Badge>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          Conversation ID: <span className="font-mono">{conversation.id}</span>
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(conversation.created_at).toLocaleString()}
                          </span>
                          {conversation.session_id ? (
                            <span className="truncate font-mono">{conversation.session_id}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <span className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors group-hover:bg-secondary/50">
                        Open Transcript
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border/50 bg-muted/5 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalConversations)} of {totalConversations}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-border/70 px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                  let pageNumber;
                  if (totalPages <= 5) pageNumber = index + 1;
                  else if (currentPage <= 3) pageNumber = index + 1;
                  else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + index;
                  else pageNumber = currentPage - 2 + index;

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`h-7 w-7 rounded-lg text-[10px] font-bold transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-border/70 px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Sheet open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <SheetContent className="w-full border-l border-border/70 bg-popover p-0 sm:max-w-[760px]">
          <SheetHeader className="border-b border-border/70 bg-secondary/30 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground shadow-sm">
                  <Bot className="h-3.5 w-3.5" />
                  Transcript
                </div>
                <SheetTitle className="mt-4 text-[28px] font-semibold tracking-tight text-foreground">
                  {selectedConversation ? getConversationLabel(selectedConversation) : 'Session transcript'}
                </SheetTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review the customer and assistant exchange in a focused conversation view.
                </p>
              </div>
            </div>

            {selectedConversation ? (
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-[20px] border border-border/70 bg-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`mt-3 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${getStatusBadgeClass(selectedConversation.status)}`}>
                    {selectedConversation.status || 'unknown'}
                  </Badge>
                </div>

                <div className="rounded-[20px] border border-border/70 bg-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Started</p>
                  <p className="mt-3 text-sm font-semibold text-foreground">{new Date(selectedConversation.created_at).toLocaleString()}</p>
                </div>

                <div className="rounded-[20px] border border-border/70 bg-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Channel</p>
                  <Badge variant="outline" className={`mt-3 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${getChannelBadgeClass(selectedConversation.channel)}`}>
                    {selectedConversation.channel || 'web'}
                  </Badge>
                </div>
              </div>
            ) : null}
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-228px)]">
            <div className="space-y-4 px-6 py-6">
              {loadingMessages ? (
                <div className="py-28 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">Loading transcript...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-28 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-secondary/35">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">No messages recorded yet</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.sender === 'user';

                  return (
                    <div key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground">
                          <Bot className="h-5 w-5" />
                        </div>
                      ) : null}

                      <div className={`max-w-[82%] ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
                        <div className={`inline-block rounded-[22px] border px-5 py-3 ${
                          isUser
                            ? 'rounded-tr-md border-foreground bg-foreground text-background'
                            : 'rounded-tl-md border-border/70 bg-secondary/20 text-foreground'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                        </div>
                        <p className="mt-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          {isUser ? 'Customer' : 'Assistant'} • {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      {isUser ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
                          <User className="h-5 w-5" />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading conversations...</div>}>
      <ConversationsContent />
    </Suspense>
  );
}
