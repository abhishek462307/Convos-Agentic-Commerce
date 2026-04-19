"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  FileText,
  ShieldCheck,
  Sparkles,
  Trash2,
  User2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MerchantAgentMessage, MerchantAgentMessageAction } from '@/types';

interface AssistantTranscriptProps {
  messages: MerchantAgentMessage[]
  loading?: boolean
  theme?: 'light' | 'dark'
  emptyTitle?: string
  emptyDescription?: string
  onAction?: (action: MerchantAgentMessageAction) => void
  onDeleteMessage?: (message: MerchantAgentMessage) => void
  canDeleteMessage?: (message: MerchantAgentMessage) => boolean
  deletingMessageId?: string | null
}

function getMessageIcon(message: MerchantAgentMessage) {
  if (message.role === 'user') return User2;
  if (message.messageType === 'approval_request') return ShieldCheck;
  if (message.messageType === 'result') return CheckCircle2;
  if (message.messageType === 'execution_update') return Sparkles;
  if (message.messageType === 'error') return AlertTriangle;
  return Bot;
}

function getMessageLabel(message: MerchantAgentMessage) {
  if (message.messageType === 'approval_request') return 'Approval';
  if (message.messageType === 'approval_result') return 'Decision';
  if (message.messageType === 'plan') return 'Plan';
  if (message.messageType === 'execution_update') return 'Execution';
  if (message.messageType === 'result') return 'Result';
  if (message.messageType === 'error') return 'Issue';
  if (message.messageType === 'handoff') return 'Handoff';
  return message.role === 'user' ? 'You' : 'Assistant';
}

function getActionKindLabel(action: MerchantAgentMessageAction) {
  if (action.kind === 'navigate') return 'Open';
  if (action.kind === 'send_prompt') return 'Run';
  return 'Action';
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getAssistantMessageTone(message: MerchantAgentMessage, isLight: boolean) {
  if (message.role === 'user') {
    return {
      shell: 'border-foreground/10 bg-foreground text-background',
      label: '',
      iconWrap: isLight ? 'border-border bg-muted/30' : 'border-white/10 bg-white/5',
      icon: isLight ? 'text-muted-foreground' : 'text-zinc-300',
    };
  }

  if (message.messageType === 'approval_request') {
    return {
      shell: isLight
        ? 'border-amber-200/80 bg-amber-50/80 text-foreground shadow-[0_18px_40px_rgba(245,158,11,0.08)]'
        : 'border-amber-500/20 bg-amber-500/10 text-zinc-100',
      label: isLight ? 'border-amber-200 bg-white/70 text-amber-700' : 'border-amber-500/20 bg-black/20 text-amber-300',
      iconWrap: isLight ? 'border-amber-200 bg-white/80' : 'border-amber-500/20 bg-amber-500/10',
      icon: isLight ? 'text-amber-700' : 'text-amber-300',
    };
  }

  if (message.messageType === 'approval_result') {
    return {
      shell: isLight
        ? 'border-emerald-200/80 bg-emerald-50/80 text-foreground shadow-[0_18px_40px_rgba(16,185,129,0.08)]'
        : 'border-emerald-500/20 bg-emerald-500/10 text-zinc-100',
      label: isLight ? 'border-emerald-200 bg-white/70 text-emerald-700' : 'border-emerald-500/20 bg-black/20 text-emerald-300',
      iconWrap: isLight ? 'border-emerald-200 bg-white/80' : 'border-emerald-500/20 bg-emerald-500/10',
      icon: isLight ? 'text-emerald-700' : 'text-emerald-300',
    };
  }

  if (message.messageType === 'result') {
    return {
      shell: isLight
        ? 'border-emerald-200/80 bg-emerald-50/80 text-foreground shadow-[0_18px_40px_rgba(16,185,129,0.08)]'
        : 'border-emerald-500/20 bg-emerald-500/10 text-zinc-100',
      label: isLight ? 'border-emerald-200 bg-white/70 text-emerald-700' : 'border-emerald-500/20 bg-black/20 text-emerald-300',
      iconWrap: isLight ? 'border-emerald-200 bg-white/80' : 'border-emerald-500/20 bg-emerald-500/10',
      icon: isLight ? 'text-emerald-700' : 'text-emerald-300',
    };
  }

  if (message.messageType === 'error') {
    return {
      shell: isLight
        ? 'border-rose-200/80 bg-rose-50/80 text-foreground shadow-[0_18px_40px_rgba(244,63,94,0.08)]'
        : 'border-rose-500/20 bg-rose-500/10 text-zinc-100',
      label: isLight ? 'border-rose-200 bg-white/70 text-rose-700' : 'border-rose-500/20 bg-black/20 text-rose-300',
      iconWrap: isLight ? 'border-rose-200 bg-white/80' : 'border-rose-500/20 bg-rose-500/10',
      icon: isLight ? 'text-rose-700' : 'text-rose-300',
    };
  }

  if (message.messageType === 'handoff') {
    return {
      shell: isLight
        ? 'border-violet-200/80 bg-violet-50/80 text-foreground shadow-[0_18px_40px_rgba(139,92,246,0.08)]'
        : 'border-violet-500/20 bg-violet-500/10 text-zinc-100',
      label: isLight ? 'border-violet-200 bg-white/70 text-violet-700' : 'border-violet-500/20 bg-black/20 text-violet-300',
      iconWrap: isLight ? 'border-violet-200 bg-white/80' : 'border-violet-500/20 bg-violet-500/10',
      icon: isLight ? 'text-violet-700' : 'text-violet-300',
    };
  }

  if (message.messageType === 'execution_update') {
    return {
      shell: isLight
        ? 'border-cyan-200/80 bg-cyan-50/80 text-foreground shadow-[0_18px_40px_rgba(6,182,212,0.08)]'
        : 'border-cyan-500/20 bg-cyan-500/10 text-zinc-100',
      label: isLight ? 'border-cyan-200 bg-white/70 text-cyan-700' : 'border-cyan-500/20 bg-black/20 text-cyan-300',
      iconWrap: isLight ? 'border-cyan-200 bg-white/80' : 'border-cyan-500/20 bg-cyan-500/10',
      icon: isLight ? 'text-cyan-700' : 'text-cyan-300',
    };
  }

  if (message.messageType === 'plan') {
    return {
      shell: isLight
        ? 'border-sky-200/80 bg-sky-50/80 text-foreground shadow-[0_18px_40px_rgba(14,165,233,0.08)]'
        : 'border-sky-500/20 bg-sky-500/10 text-zinc-100',
      label: isLight ? 'border-sky-200 bg-white/70 text-sky-700' : 'border-sky-500/20 bg-black/20 text-sky-300',
      iconWrap: isLight ? 'border-sky-200 bg-white/80' : 'border-sky-500/20 bg-sky-500/10',
      icon: isLight ? 'text-sky-700' : 'text-sky-300',
    };
  }

  return {
    shell: isLight
      ? 'border-border bg-card text-foreground shadow-[0_18px_40px_rgba(15,23,42,0.06)]'
      : 'border-white/10 bg-white/5 text-zinc-100',
    label: isLight ? 'border-border bg-background text-muted-foreground' : 'border-white/10 bg-black/20 text-zinc-300',
    iconWrap: isLight ? 'border-border bg-background' : 'border-white/10 bg-white/5',
    icon: isLight ? 'text-muted-foreground' : 'text-zinc-300',
  };
}

function getActionButtonTone(action: MerchantAgentMessageAction, isLight: boolean) {
  if (action.kind === 'approve') {
    return isLight
      ? 'border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700'
      : 'border-emerald-500/30 bg-emerald-500 text-white hover:bg-emerald-400';
  }

  if (action.kind === 'reject') {
    return isLight
      ? 'border-border bg-background text-foreground hover:bg-muted'
      : 'border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white';
  }

  return isLight
    ? 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
    : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white';
}

export function AssistantTranscript({
  messages,
  loading = false,
  theme = 'light',
  emptyTitle = 'Start the conversation',
  emptyDescription = 'Ask Convos a question or give it a task to work on.',
  onAction,
  onDeleteMessage,
  canDeleteMessage,
  deletingMessageId = null,
}: AssistantTranscriptProps) {
  const isLight = theme === 'light';

  if (!loading && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className={cn(
            'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border',
            isLight ? 'border-border bg-muted/30' : 'border-white/10 bg-white/5'
          )}>
            <Bot className={cn('h-5 w-5', isLight ? 'text-muted-foreground' : 'text-zinc-400')} />
          </div>
          <p className={cn('text-sm font-medium', isLight ? 'text-foreground' : 'text-white')}>{emptyTitle}</p>
          <p className={cn('mt-1 text-xs', isLight ? 'text-muted-foreground' : 'text-zinc-400')}>{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const Icon = getMessageIcon(message);
        const isUser = message.role === 'user';
        const tone = getAssistantMessageTone(message, isLight);
        const showDeleteButton = canDeleteMessage?.(message) && typeof onDeleteMessage === 'function';

        return (
          <div key={message.id} className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
            {!isUser ? (
              <div className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                tone.iconWrap
              )}>
                <Icon className={cn('h-4 w-4', tone.icon)} />
              </div>
            ) : null}

            <div className={cn('max-w-[88%]', isUser ? 'order-first' : '')}>
              <div className={cn(
                'rounded-[24px] border px-4 py-3',
                tone.shell
              )}>
                {!isUser ? (
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                      tone.label
                    )}>
                      {getMessageLabel(message)}
                    </span>
                    {message.status ? (
                      <span className={cn('text-[10px]', isLight ? 'text-muted-foreground' : 'text-zinc-500')}>
                        {message.status.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                    </div>
                    {showDeleteButton ? (
                      <button
                        type="button"
                        onClick={() => onDeleteMessage?.(message)}
                        disabled={deletingMessageId === message.id}
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                          isLight
                            ? 'border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground'
                            : 'border-white/10 bg-black/20 text-zinc-400 hover:text-white'
                        )}
                        aria-label="Delete assistant message"
                        title="Delete assistant message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {isUser ? (
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-6">{children}</p>,
                      ul: ({ children }) => <ul className="mb-2 space-y-1 pl-4 text-sm leading-6">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 text-sm leading-6">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      h1: ({ children }) => <h1 className="mb-2 text-base font-semibold">{children}</h1>,
                      h2: ({ children }) => <h2 className="mb-2 text-sm font-semibold">{children}</h2>,
                      h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold">{children}</h3>,
                      code: ({ children }) => (
                        <code className={cn(
                          'rounded px-1.5 py-0.5 text-[11px]',
                          isLight ? 'bg-white/70 text-foreground' : 'bg-black/20 text-zinc-200'
                        )}>
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className={cn(
                          'mb-2 overflow-x-auto rounded-lg border p-3 text-[11px]',
                          isLight ? 'border-border bg-muted/40' : 'border-white/10 bg-black/20'
                        )}>
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>

              {message.actions && message.actions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => onAction?.(action)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                        getActionButtonTone(action, isLight)
                      )}
                    >
                      <ChevronRight className="h-3 w-3" />
                      <span>{action.label}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        isLight ? 'bg-muted text-muted-foreground' : 'bg-black/20 text-zinc-300'
                      )}>
                        {getActionKindLabel(action)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <p className={cn('mt-2 text-[11px]', isLight ? 'text-muted-foreground' : 'text-zinc-500')}>
                {formatMessageTime(message.createdAt)}
              </p>
            </div>

            {isUser ? (
              <div className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                isLight ? 'border-border bg-muted/30' : 'border-white/10 bg-white/5'
              )}>
                <User2 className={cn('h-4 w-4', isLight ? 'text-muted-foreground' : 'text-zinc-300')} />
              </div>
            ) : null}
          </div>
        );
      })}

      {loading ? (
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border',
            isLight ? 'border-border bg-background' : 'border-white/10 bg-white/5'
          )}>
            <FileText className={cn('h-4 w-4 animate-pulse', isLight ? 'text-muted-foreground' : 'text-zinc-300')} />
          </div>
          <div className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            isLight ? 'border-border bg-card text-muted-foreground' : 'border-white/10 bg-white/5 text-zinc-400'
          )}>
            Convos is thinking...
          </div>
        </div>
      ) : null}
    </div>
  );
}
