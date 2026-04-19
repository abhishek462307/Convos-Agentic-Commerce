"use client"

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Phone } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SwiggyMinisHeader } from '@/components/SwiggyMinisHeader';
import { SwiggyChatInput } from '@/components/SwiggyChatInput';
import { QUICK_ACTIONS } from '@/lib/storefront';
import { useStoreCart, useStoreChat, useStoreData, useStoreSession } from '@/providers/storefront';
import { CallbackRequestModal } from './CallbackRequestModal';
import { StorefrontFooter } from './StorefrontFooter';
import { StorefrontMobileHeader } from './StorefrontMobileHeader';
import { StorefrontSections } from './StorefrontSections';

const MobileChatOverlay = dynamic(
  () => import('./MobileChatOverlay').then((mod) => mod.MobileChatOverlay),
  { ssr: false }
);

export function StorefrontMobileLayout({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  
  const { merchant, allProducts, aiUnavailable, setAiUnavailable } = useStoreData();
  
  const { cart, isCartOpen, isCheckoutOpen } = useStoreCart();
  const {
    viewMode,
    setViewMode,
    isTyping,
    inputText,
    setInputText,
    isListening,
    toggleListening,
    handleSendMessage,
    isVoiceMode,
  } = useStoreChat();
  const { setIsLoginOpen } = useStoreSession();

  const branding = merchant?.branding_settings || {};
  const chatEnabled = branding.enable_chat !== false;

  if (!merchant) {
    return null;
  }

  const basePath = `/store/${merchant.subdomain}`;
  const normalizedPath = pathname?.replace(/\/$/, '') || basePath;
  const isMainStorePage = normalizedPath === basePath;
  const isCartPage = normalizedPath === `${basePath}/cart`;
  const authSegments = new Set(['login', 'signup', 'verify', 'account', 'checkout']);
  const lastSegment = normalizedPath.split('/').filter(Boolean).pop() || '';
  const isAuthPage = authSegments.has(lastSegment);
  const hasChildren = Boolean(children);

  return (
    <div className="md:hidden flex flex-col min-h-[100dvh]">
      {isMainStorePage ? (
        <SwiggyMinisHeader
          merchant={merchant}
          branding={branding}
          cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
          onOpenCart={() => router.push(`/store/${merchant.subdomain}/cart`)}
          onOpenLogin={() => setIsLoginOpen(true)}
        />
      ) : (
        <StorefrontMobileHeader
          subdomain={merchant.subdomain}
          storeName={merchant.store_name || merchant.business_name || merchant.subdomain}
        />
      )}

      <div className="flex-1">
        <div className="w-full">
          <AnimatePresence mode="wait">
            {viewMode === 'store' && (
              <motion.div
                key="store"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={isMainStorePage ? "pb-16" : ""}
              >
                <div className={cn(
                  "px-4 md:px-8 max-w-7xl mx-auto",
                  isMainStorePage ? "pb-24" : "pt-0 pb-16"
                )}>
                  {aiUnavailable && chatEnabled && (
                    <div
                      className="mb-6 rounded-2xl border px-4 py-3 text-[12px] font-semibold flex items-center justify-between gap-3"
                      style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)', color: 'var(--store-text)' }}
                    >
                      <span className="flex-1">AI assistant is unavailable. You can still browse and checkout.</span>
                      <button
                        className="text-[11px] font-semibold shrink-0 flex items-center gap-1"
                        style={{ color: 'var(--primary)' }}
                        onClick={() => setIsCallbackOpen(true)}
                      >
                        <Phone className="w-3 h-3" />
                        Callback
                      </button>
                      <button
                        className="text-[11px] font-black shrink-0"
                        style={{ color: 'var(--store-text-muted)' }}
                        onClick={() => setAiUnavailable(false)}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                    {children}

                    {/* Full dynamic sections for the home page */}
                    {!hasChildren && (
                      <StorefrontSections
                        subdomain={merchant.subdomain}
                      />
                    )}


                  {!isAuthPage && (
                    <div className="pt-8">
                      <StorefrontFooter merchant={merchant} />
                    </div>
                  )}
                </div>

                {!hasChildren && allProducts.length === 0 && (
                  <div className="px-4 md:px-8 py-24 text-center">
                    <div
                      className="w-20 h-20 shadow-sm border rounded-full flex items-center justify-center mx-auto mb-6"
                      style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}
                    >
                      <Package className="w-10 h-10" style={{ color: 'var(--store-text-muted)' }} />
                    </div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--store-text)' }}>No products found</h3>
                    <p className="mt-2" style={{ color: 'var(--store-text-muted)' }}>
                      Try checking back later or browse other categories.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {viewMode === 'chat' && (
          <MobileChatOverlay
            onSpecialAction={(action) => {
              if (action === '__callback__') {
                setIsCallbackOpen(true);
              } else if (action === '__browse__') {
                setViewMode('store');
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatEnabled && !isCartPage && !isAuthPage && !isCartOpen && !isCheckoutOpen && (
          <SwiggyChatInput
            inputText={inputText}
            setInputText={setInputText}
            isListening={isListening}
            isTyping={isTyping}
            onSubmit={handleSendMessage}
            toggleListening={toggleListening}
            quickActions={QUICK_ACTIONS}
            onQuickAction={(label: string) => handleSendMessage(undefined, label)}
            showQuickActions={viewMode === 'store' && !inputText.trim() && !isTyping && !isVoiceMode}
            onFocus={() => setViewMode('chat')}
            hidden={false}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!chatEnabled && !isAuthPage && !isCartOpen && !isCheckoutOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 inset-x-0 z-40 px-4 pb-6 pt-3"
            style={{ background: 'linear-gradient(to top, var(--store-bg) 70%, transparent)' }}
          >
            <button
              onClick={() => setIsCallbackOpen(true)}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-[14px] font-semibold text-white shadow-lg transition-all active:scale-[0.98]"
              style={{ background: 'var(--primary)' }}
            >
              <Phone className="w-4 h-4" />
              Request a Callback
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CallbackRequestModal
        isOpen={isCallbackOpen}
        onClose={() => setIsCallbackOpen(false)}
        subdomain={merchant.subdomain}
        storeName={merchant.store_name || ''}
      />
    </div>
  );
}
