"use client"

import React from 'react';
import { Phone } from 'lucide-react';
import { StorefrontDesktopHeader } from './StorefrontDesktopHeader';
import { StorefrontFooter } from './StorefrontFooter';
import { useStoreData } from '@/providers/storefront';

export function DesktopStorePane({
  desktopStoreScrollRef,
  showAiStoreButton,
  onAiStoreClick,
  showAiUnavailableBanner,
  showCallbackButton,
  onCallbackClick,
  storefrontContent,
}: {
  desktopStoreScrollRef: React.RefObject<HTMLDivElement | null>;
  showAiStoreButton: boolean;
  onAiStoreClick?: () => void;
  showAiUnavailableBanner: boolean;
  showCallbackButton?: boolean;
  onCallbackClick?: () => void;
  storefrontContent: React.ReactNode;
}) {
  const { merchant, aiUnavailable, setAiUnavailable } = useStoreData();

  if (!merchant) return null;
  
  return (
    <div ref={desktopStoreScrollRef} className="flex-1 overflow-y-auto scroll-smooth relative" style={{ background: 'var(--store-bg)' }}>
      <StorefrontDesktopHeader
        showAiStoreButton={showAiStoreButton}
        onAiStoreClick={onAiStoreClick}
        showCallbackButton={showCallbackButton}
        onCallbackClick={onCallbackClick}
      />

        <div className="w-full">
          {showAiUnavailableBanner && aiUnavailable && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border px-4 py-2.5 text-[12px] font-medium flex items-center justify-between gap-3" style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)', color: 'var(--store-text)' }}>
              <span className="flex-1">AI assistant is temporarily unavailable. You can still browse and checkout.</span>
              {onCallbackClick && (
                <button className="text-[11px] font-semibold shrink-0 flex items-center gap-1" style={{ color: 'var(--primary)' }} onClick={onCallbackClick}>
                  <Phone className="w-3 h-3" />
                  Request Callback
                </button>
              )}
              <button className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--store-text-muted)' }} onClick={() => setAiUnavailable(false)}>✕</button>
            </div>
          )}
          {storefrontContent}
        </div>

      <StorefrontFooter merchant={merchant} />
    </div>
  );
}
