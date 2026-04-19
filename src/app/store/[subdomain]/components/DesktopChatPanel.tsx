"use client"

import React, { useCallback, useMemo } from 'react';
import { ShoppingBag, ChevronRight, Home, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import { SwiggyChatInput } from '@/components/SwiggyChatInput';
import { IdentityCard } from '@/components/StoreMissionStatus';
import { AICommerceMetaBlocks } from '@/components/AICommercePanels';
import Image from 'next/image';

import { calculateTextHeight } from '@/lib/text-measurement';
import { QUICK_ACTIONS } from '@/lib/storefront';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  useStoreData, 
  useStoreCart, 
  useStoreChat, 
  useStoreSession 
} from '@/providers/storefront';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false, loading: () => <span className="text-[13px]">...</span> });

type SuggestionButtonOption = string | { label: string; action?: string };

export interface DesktopChatPanelProps {
  onSpecialAction?: (action: string) => void;
}

export const DesktopChatPanel = React.memo(function DesktopChatPanel({
  onSpecialAction
}: DesktopChatPanelProps) {
  const { merchant } = useStoreData();
  const {
    messages, isTyping, inputText, setInputText, handleSendMessage,
    isListening, toggleListening, isVoiceMode, chatScrollRef, chatWidth,
    clearChat, voiceChat
  } = useStoreChat();
  const { 
    setIsCartOpen, setIsCheckoutOpen, handleCheckoutClick 
  } = useStoreCart();
  const { 
    subdomain, setConsumerEmail, setInteractionStage 
  } = useStoreSession();

  const triggerAction = useCallback((action: string, label: string) => {
    if (action === '__retry__') {
      const lastUserMessage = [...messages].reverse().find((message) => message.sender === 'user' && message.text)?.text;
      if (lastUserMessage) handleSendMessage(undefined, lastUserMessage);
      return;
    }
    if (action === '__checkout__') {
      handleCheckoutClick();
      return;
    }
    if (action.startsWith('__') && onSpecialAction) {
      onSpecialAction(action);
      return;
    }
    handleSendMessage(undefined, label);
  }, [messages, handleSendMessage, handleCheckoutClick, onSpecialAction]);

  const displayMessages = useMemo(() => messages.filter(m => m.text || m.sender === 'user'), [messages]);

  const rowVirtualizer = useVirtualizer({
    count: displayMessages.length,
    getScrollElement: () => chatScrollRef.current,
    estimateSize: useCallback((index: number) => {
      const msg = displayMessages[index];
      const containerWidth = typeof window !== 'undefined' ? (window.innerWidth * (chatWidth / 100)) : 400;
      const bubbleMaxWidth = (containerWidth - 80) * 0.85;
      
      const textHeight = calculateTextHeight(msg.text || '', {
        maxWidth: bubbleMaxWidth,
        fontSize: '13px',
        lineHeight: 21.5,
        verticalPadding: 20
      });

      let extraHeight = 0;
      if (msg.metadata?.suggestionButtons?.length) extraHeight += 40;
      if (msg.metadata?.showCartButtons) extraHeight += 50;
      if (msg.metadata?.requiresIdentification) extraHeight += 120;
      if (msg.metadata?.products?.length || msg.metadata?.comparison || msg.metadata?.checkoutConfidence) {
        extraHeight += 100;
      }

      return textHeight + extraHeight + 16;
    }, [displayMessages, chatWidth]),
    overscan: 5,
  });

  if (!merchant) return null;

  return (
    <div
      className="flex flex-col border-l relative z-10 overflow-hidden flex-shrink-0 min-h-0"
      style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)', width: `${chatWidth}%` }}
    >
      <div className="h-16 px-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--store-border)', background: 'var(--store-bg)' }}>
        <div className="flex items-center gap-3">
          {merchant.ai_character_avatar_url && (
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: 'var(--store-border)' }}>
              <Image src={merchant.ai_character_avatar_url} alt={merchant.ai_character_name || 'AI'} width={36} height={36} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--store-text)' }}>
                {merchant.ai_character_name || 'Chat'}
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            {merchant.branding_settings?.ai_character_subtitle && (
              <span className="text-[11px] leading-tight" style={{ color: 'var(--store-text)', opacity: 0.5 }}>
                {merchant.branding_settings.ai_character_subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => clearChat()}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--store-card-bg)', border: '1px solid var(--store-border)' }}
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--store-text-muted)' }} />
          </button>
          <button
            onClick={() => setInteractionStage('landing')}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--store-card-bg)', border: '1px solid var(--store-border)' }}
            aria-label="Back to home"
          >
            <Home className="w-3.5 h-3.5" style={{ color: 'var(--store-text-muted)' }} />
          </button>
        </div>
      </div>

      <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 scrollbar-hide relative z-10">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const msg = displayMessages[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute top-0 left-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '16px'
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${msg.sender === 'user' ? 'flex-col items-end' : 'items-start gap-2'}`}
                >
                  {msg.sender !== 'user' && merchant.ai_character_avatar_url && (
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border" style={{ borderColor: 'var(--store-border)' }}>
                      <Image src={merchant.ai_character_avatar_url} alt={merchant.ai_character_name || 'AI'} width={28} height={28} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col">
                    <div
                      className={`w-full max-w-[85%] px-4 py-3 text-[13px] leading-[1.65] ${
                        msg.sender === 'user'
                          ? 'text-white rounded-[26px] rounded-br-[10px]'
                          : 'rounded-[26px] rounded-bl-[10px] border'
                      }`}
                      style={{
                        backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'var(--store-card-bg)',
                        borderColor: msg.sender === 'user' ? undefined : 'var(--store-border)',
                        color: msg.sender === 'user' ? '#fff' : 'var(--store-text)',
                        boxShadow: msg.sender === 'user'
                          ? '0 14px 34px color-mix(in srgb, var(--primary) 18%, transparent)'
                          : '0 10px 30px rgba(0,0,0,0.04)',
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className={`mb-1 last:mb-0 ${msg.sender === 'user' ? 'text-white' : ''}`}>{children}</p>,
                          strong: ({ children }) => <span className="font-semibold">{children}</span>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {msg.metadata?.suggestionButtons && msg.metadata.suggestionButtons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                        {msg.metadata.suggestionButtons.map((option: SuggestionButtonOption, i: number) => {
                          const label = typeof option === 'string' ? option : option.label;
                          const action = typeof option === 'string' ? undefined : option.action;
                          return (
                            <button
                              key={i}
                              className="h-8 px-3.5 text-[11px] font-semibold rounded-full border transition-all hover:border-primary/50 hover:text-primary active:scale-[0.97]"
                              style={{ borderColor: 'var(--store-border)', color: 'var(--store-text-muted)', background: 'var(--store-card-bg)' }}
                              onClick={() => {
                                if (action) {
                                  triggerAction(action, label);
                                } else {
                                  handleSendMessage(undefined, label);
                                }
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {msg.metadata?.requiresIdentification && (
                      <IdentityCard subdomain={subdomain} onIdentify={(email) => setConsumerEmail(email)} />
                    )}

                    {msg.metadata?.showCartButtons && (
                      <div className="flex gap-2 mt-2.5 max-w-[85%]">
                        <button
                          className="flex-1 h-9 text-[11px] font-semibold rounded-full border flex items-center justify-center gap-1.5 transition-all hover:border-primary/40 active:scale-[0.97]"
                          style={{ borderColor: 'var(--store-border)', color: 'var(--store-text)', background: 'var(--store-card-bg)' }}
                          onClick={() => setIsCartOpen(true)}
                        >
                          <ShoppingBag className="w-3 h-3" />
                          View Cart
                        </button>
                        <button
                          className="flex-1 h-9 text-[11px] font-semibold text-white rounded-full flex items-center justify-center gap-1 transition-all active:scale-[0.97]"
                          style={{ background: 'var(--primary)', boxShadow: '0 12px 28px color-mix(in srgb, var(--primary) 24%, transparent)' }}
                          onClick={() => setIsCheckoutOpen(true)}
                        >
                          Checkout <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="w-full max-w-[85%] mt-2.5 space-y-2.5">
                      <AICommerceMetaBlocks
                        metadata={msg.metadata}
                        merchant={merchant}
                        compact
                        onAction={triggerAction}
                        hideFilters
                        hideRefinements
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="popLayout">
          {isTyping && !messages.some(m => m.id?.includes('-streaming') && m.text) && (
            <div className="flex items-start gap-2 mt-4">
              {merchant.ai_character_avatar_url && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border" style={{ borderColor: 'var(--store-border)' }}>
                  <Image src={merchant.ai_character_avatar_url} alt={merchant.ai_character_name || 'AI'} width={28} height={28} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="px-4 py-2.5 rounded-2xl rounded-bl-md border flex items-center gap-1.5" style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}>
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--store-text-muted)' }} />
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.15 }} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--store-text-muted)' }} />
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.3 }} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--store-text-muted)' }} />
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 py-3 border-t shrink-0 relative z-20" style={{ borderColor: 'var(--store-border)', background: 'var(--store-bg)' }}>
        <SwiggyChatInput
          inputText={inputText}
          setInputText={setInputText}
          isListening={isListening}
          isTyping={isTyping}
          onSubmit={handleSendMessage}
          toggleListening={toggleListening}
          quickActions={QUICK_ACTIONS}
          onQuickAction={(label: string) => handleSendMessage(undefined, label)}
          showQuickActions={false}
          onFocus={() => {}}
          hidden={false}
          isVoiceMode={isVoiceMode}
          voiceState={voiceChat.voiceState}
          isCompact={true}
        />
      </div>
    </div>
  );
});
