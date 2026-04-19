"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { LandingHero } from '@/components/StoreLandingHero';
import { QUICK_ACTIONS } from '@/lib/storefront';
import { useStoreCart, useStoreChat, useStoreData, useStoreSession } from '@/providers/storefront';
import { CallbackRequestModal } from './CallbackRequestModal';
import { DesktopStorePane } from './DesktopStorePane';
import { StorefrontSections } from './StorefrontSections';
import type { DesktopChatPanelProps } from './DesktopChatPanel';

const DesktopChatPanel = dynamic<DesktopChatPanelProps>(
  () => import('./DesktopChatPanel').then((mod) => mod.DesktopChatPanel),
  { ssr: false }
);

export function StorefrontDesktopLayout({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const desktopStoreScrollRef = useRef<HTMLDivElement>(null);

  const { merchant, loaderConfig } = useStoreData();
  const { cart } = useStoreCart();
  const { interactionStage, currentUser, setIsLoginOpen } = useStoreSession();
  const {
    desktopMode,
    setDesktopMode,
    isTyping,
    inputText,
    setInputText,
    isListening,
    toggleListening,
    handleSendMessage,
    setChatWidth,
  } = useStoreChat();

  const branding = merchant?.branding_settings || {};
  const chatEnabled = branding.enable_chat !== false;
  const hasNestedPageContent = Boolean(children);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const effectiveDesktopMode = chatEnabled ? desktopMode : 'browse';
  const effectiveInteractionStage = chatEnabled ? interactionStage : 'active';

  const storefrontContent = useMemo(() => {
    if (children) {
      return <>{children}</>;
    }
    return (
      <StorefrontSections
        subdomain={merchant?.subdomain || ''}
      />
    );
  }, [children, merchant?.subdomain]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const nextWidth = ((rect.right - event.clientX) / rect.width) * 100;
      setChatWidth(Math.min(60, Math.max(18, nextWidth)));
    };

    const handleMouseUp = () => {
      if (!isResizing.current) {
        return;
      }

      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setChatWidth]);

  if (!merchant) {
    return null;
  }

  return (
    <>
      <div className="hidden md:flex flex-col flex-1 overflow-hidden min-h-0">
        {hasNestedPageContent ? (
          <div className="flex flex-1 min-h-0">
            <DesktopStorePane
              desktopStoreScrollRef={desktopStoreScrollRef}
              showAiStoreButton={false}
              showAiUnavailableBanner={false}
              showCallbackButton={!chatEnabled}
              onCallbackClick={() => setIsCallbackOpen(true)}
              storefrontContent={storefrontContent}
            />
          </div>
        ) : !chatEnabled ? (
          <div className="flex flex-1 min-h-0">
            <DesktopStorePane
              desktopStoreScrollRef={desktopStoreScrollRef}
              showAiStoreButton={false}
              showAiUnavailableBanner={false}
              showCallbackButton={!chatEnabled}
              onCallbackClick={() => setIsCallbackOpen(true)}
              storefrontContent={storefrontContent}
            />
          </div>
        ) : !hasNestedPageContent && effectiveInteractionStage === 'landing' && effectiveDesktopMode === 'ai' ? (
          <LandingHero
            merchant={merchant}
            loaderConfig={loaderConfig}
            inputText={inputText}
            setInputText={setInputText}
            isListening={isListening}
            isTyping={isTyping}
            onSubmit={handleSendMessage}
            toggleListening={toggleListening}
            quickActions={QUICK_ACTIONS}
            onQuickAction={(label: string) => handleSendMessage(undefined, label)}
            cartCount={cartCount}
            onOpenCart={() => router.push(`/store/${merchant.subdomain}/cart`)}
            onOpenLogin={() => setIsLoginOpen(true)}
            currentUser={currentUser}
            subdomain={merchant.subdomain}
            desktopMode={desktopMode}
            onToggleMode={(mode: 'ai' | 'browse') => setDesktopMode(mode)}
          />
        ) : !hasNestedPageContent && effectiveDesktopMode === 'browse' && effectiveInteractionStage === 'landing' ? (
          <DesktopStorePane
            desktopStoreScrollRef={desktopStoreScrollRef}
            showAiStoreButton={chatEnabled}
            onAiStoreClick={() => setDesktopMode('ai')}
            showAiUnavailableBanner={false}
            showCallbackButton={!chatEnabled}
            onCallbackClick={() => setIsCallbackOpen(true)}
            storefrontContent={storefrontContent}
          />
        ) : (
          <div className="flex flex-1 min-h-0" ref={containerRef} style={{ background: 'var(--store-bg)' }}>
            <DesktopStorePane
              desktopStoreScrollRef={desktopStoreScrollRef}
              showAiStoreButton={false}
              showAiUnavailableBanner={chatEnabled}
              showCallbackButton={!chatEnabled}
              onCallbackClick={() => setIsCallbackOpen(true)}
              storefrontContent={storefrontContent}
            />

            <div
              className="w-[3px] cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors relative z-20 flex-shrink-0"
              style={{ background: 'var(--store-border)' }}
              onMouseDown={(event) => {
                event.preventDefault();
                isResizing.current = true;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>

            <DesktopChatPanel
              onSpecialAction={(action: string) => {
                if (action === '__callback__') {
                  setIsCallbackOpen(true);
                } else if (action === '__browse__') {
                  setDesktopMode('browse');
                }
              }}
            />
          </div>
        )}
      </div>

      <CallbackRequestModal
        isOpen={isCallbackOpen}
        onClose={() => setIsCallbackOpen(false)}
        subdomain={merchant.subdomain}
        storeName={merchant.store_name || ''}
      />
    </>
  );
}
