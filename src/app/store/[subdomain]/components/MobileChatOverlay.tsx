"use client"

import React from 'react';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import { AICommerceMetaBlocks } from '@/components/AICommercePanels';
import { IdentityCard } from '@/components/StoreMissionStatus';
import Image from 'next/image';
import { QUICK_ACTIONS } from '@/lib/storefront';
import { 
  useStoreData, 
  useStoreCart, 
  useStoreChat, 
  useStoreSession 
} from '@/providers/storefront';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false, loading: () => <span className="text-[13px]">...</span> });

type SuggestionButtonOption = string | { label: string; action?: string };

export interface MobileChatOverlayProps {
  onSpecialAction?: (action: string) => void;
}

export const MobileChatOverlay = React.memo(function MobileChatOverlay({
  onSpecialAction,
}: MobileChatOverlayProps) {
  const { merchant } = useStoreData();
  const { 
    messages, isTyping, isVoiceMode, chatScrollRef, handleSendMessage, setViewMode 
  } = useStoreChat();
  const { setIsCartOpen, handleCheckoutClick } = useStoreCart();
  const { subdomain, setConsumerEmail } = useStoreSession();
  
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);

  const triggerAction = React.useCallback((action: string, label: string) => {
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

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  if (!merchant) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setViewMode('store')}
        className="fixed inset-0 z-[44] bg-black/10 backdrop-blur-[2px]"
      />
      <motion.div
        key="chat-overlay"
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 top-[10%] z-[45] flex flex-col rounded-t-[32px] overflow-hidden"
          style={{
            bottom: keyboardOffset,
            backgroundColor: 'color-mix(in srgb, var(--store-bg) 85%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.08)'
          }}
      >
          <div
            className="w-full flex justify-center py-4 cursor-pointer"
            onClick={() => setViewMode('store')}
          >
            <div className="w-12 h-1.5 bg-gray-300/60 rounded-full" />
          </div>

          {(merchant.ai_character_name || merchant.branding_settings?.ai_character_subtitle) && (
            <div className="px-4 pb-3 flex items-center gap-2">
              {merchant.ai_character_avatar_url && (
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: 'var(--store-border)' }}>
                  <Image src={merchant.ai_character_avatar_url} alt={merchant.ai_character_name || 'AI'} width={24} height={24} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col">
                {merchant.ai_character_name && (
                  <span className="text-[12px] font-medium" style={{ color: 'var(--store-text)' }}>
                    {merchant.ai_character_name}
                  </span>
                )}
                {merchant.branding_settings?.ai_character_subtitle && (
                  <span className="text-[10px] leading-tight" style={{ color: 'var(--store-text)', opacity: 0.5 }}>
                    {merchant.branding_settings.ai_character_subtitle}
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6 w-full scrollbar-hide" style={{ paddingBottom: keyboardOffset > 0 ? 16 : 112 }}>
          <AnimatePresence mode="popLayout">
              {messages.filter(m => m.text || m.sender === 'user').map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.sender === 'user' ? 'flex-col items-end' : 'items-start gap-2'}`}
                >
                  {msg.sender !== 'user' && merchant.ai_character_avatar_url && (
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border" style={{ borderColor: 'var(--store-border)' }}>
                      <Image src={merchant.ai_character_avatar_url} alt={merchant.ai_character_name || 'AI'} width={28} height={28} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col">
                <div
                  className={`w-full max-w-[85%] px-4 py-3 text-[14px] leading-relaxed ${
                    msg.sender === 'user' ? 'text-white rounded-[32px] rounded-tr-none' : 'rounded-[32px] rounded-tl-none border'
                  }`}
                  style={{
                    backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'var(--store-card-bg)',
                    borderColor: 'var(--store-border)',
                    color: msg.sender === 'user' ? '#fff' : 'var(--store-text)',
                    borderRadius: 'var(--card-radius)'
                  }}
                >
                  <div className={msg.sender === 'user' ? '[&_*]:!text-white' : ''}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <span className="font-bold">{children}</span>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>

                {msg.metadata?.suggestionButtons && msg.metadata.suggestionButtons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 w-full max-w-[85%]">
                    {msg.metadata.suggestionButtons.map((option: SuggestionButtonOption, i: number) => {
                      const label = typeof option === 'string' ? option : option.label;
                      const action = typeof option === 'string' ? undefined : option.action;
                      return (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-9 px-4 text-[12px] font-semibold rounded-full hover:border-primary hover:text-primary transition-all"
                          style={{ borderRadius: '9999px', background: 'var(--store-card-bg)', borderColor: 'var(--store-border)', color: 'var(--store-text-muted)' }}
                          onClick={() => {
                            if (action) {
                              triggerAction(action, label);
                            } else {
                              handleSendMessage(undefined, label);
                            }
                          }}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {msg.metadata?.requiresIdentification && (
                  <IdentityCard subdomain={subdomain} onIdentify={(email) => setConsumerEmail(email)} />
                )}

                {msg.metadata?.showCartButtons && (
                  <div className="flex gap-2 mt-2 w-full max-w-[85%]">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 text-[13px] font-bold shadow-sm"
                      style={{
                        background: 'var(--store-card-bg)',
                        borderColor: 'var(--store-border)',
                        borderRadius: 'var(--card-radius-sm)',
                        color: 'var(--store-text)'
                      }}
                      onClick={() => setIsCartOpen(true)}
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      View Cart
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-10 text-[13px] font-black shadow-md"
                      style={{
                        background: 'var(--primary)',
                        borderRadius: 'var(--card-radius-sm)'
                      }}
                      onClick={handleCheckoutClick}
                    >
                      Checkout <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}

                <div className="w-full max-w-[85%] mt-3 space-y-2">
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
              ))}

              {isTyping && !messages.some(m => m.id?.includes('-streaming') && m.text) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div
                    className="px-4 py-3 rounded-[32px] rounded-tl-none shadow-sm flex gap-1 border"
                    style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '0ms', background: 'var(--store-text-muted)' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '150ms', background: 'var(--store-text-muted)' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ animationDelay: '300ms', background: 'var(--store-text-muted)' }} />
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          {messages.length <= 1 && !isTyping && !isVoiceMode && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-wrap gap-2 justify-center mt-4">
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(undefined, action.label)}
                  className="flex items-center gap-2 border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 shadow-sm hover:border-primary hover:text-primary"
                  style={{
                    background: 'var(--store-card-bg)',
                    borderColor: 'var(--store-border)',
                    color: 'var(--store-text-muted)',
                    borderRadius: 'var(--card-radius-sm)'
                  }}
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
});
