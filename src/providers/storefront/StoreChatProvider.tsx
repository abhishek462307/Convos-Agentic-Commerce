"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { useStorefrontChat } from '@/hooks/storefront/useStorefrontChat';
import { useStorefrontRealtime } from '@/hooks/storefront/useStorefrontRealtime';
import { useStoreCartContext } from './StoreCartProvider';
import { useStoreDataContext } from './StoreDataProvider';
import { useStoreSessionContext } from './StoreSessionProvider';

type StoreChatContextValue = Omit<ReturnType<typeof useStorefrontChat>, 'toggleListening' | 'handleSendMessage'> & {
  handleSendMessage: (e?: React.FormEvent, overrideText?: string) => Promise<void>;
  toggleListening: () => void;
} & ReturnType<typeof useStorefrontRealtime>;

const StoreChatContext = createContext<StoreChatContextValue | null>(null);

export function StoreChatProvider({ children }: { children: React.ReactNode }) {
  const { subdomain, sessionId, consumerEmail, setConsumerEmail, currentUser, setInteractionStage } = useStoreSessionContext();
  const { merchant, initialMessages, welcomeMessage } = useStoreDataContext();
  const { cart, appliedCoupon, handleCartActions } = useStoreCartContext();
  const recognitionRef = useRef<any>(null);

  const chatState = useStorefrontChat({
    subdomain,
    merchant,
    sessionId,
    currentUserEmail: currentUser?.email || null,
    consumerEmail,
    setConsumerEmail,
    cart,
    appliedCoupon,
    onHandleCartActions: handleCartActions,
    initialMessages,
    welcomeMessage,
  });
  const {
    setInputText,
    handleSendMessage: baseHandleSendMessage,
    toggleListening: baseToggleListening,
  } = chatState;

  const realtimeState = useStorefrontRealtime(merchant?.id, consumerEmail);

  useEffect(() => {
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.onresult = (event: any) => {
      setInputText(event.results[0][0].transcript);
    };
    recognitionRef.current.onerror = () => toast.error('Voice recognition failed.');
  }, [setInputText]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent, overrideText?: string) => {
    setInteractionStage('active');
    await baseHandleSendMessage(e, overrideText);
  }, [baseHandleSendMessage, setInteractionStage]);

  const toggleListening = useCallback(() => {
    baseToggleListening(recognitionRef);
  }, [baseToggleListening]);

  return (
    <StoreChatContext.Provider
      value={{
        ...chatState,
        ...realtimeState,
        handleSendMessage,
        toggleListening,
      }}
    >
      {children}
    </StoreChatContext.Provider>
  );
}

export function useStoreChatContext() {
  const context = useContext(StoreChatContext);
  if (!context) {
    throw new Error('useStoreChatContext must be used within StoreChatProvider');
  }
  return context;
}
