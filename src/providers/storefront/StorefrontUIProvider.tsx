"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useStorefrontProducts } from '@/hooks/storefront/useStorefrontProducts';
import { useStoreCartContext } from './StoreCartProvider';
import { useStoreChatContext } from './StoreChatProvider';
import { useStoreDataContext } from './StoreDataProvider';
import { useStoreSessionContext } from './StoreSessionProvider';

type StorefrontUIContextValue = ReturnType<typeof useStorefrontProducts> & {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: string | null;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string | null>>;
  navCategories: any[];
  isCartOpen: boolean;
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLoginOpen: boolean;
  setIsLoginOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openCheckoutAfterLogin: boolean;
  setOpenCheckoutAfterLogin: React.Dispatch<React.SetStateAction<boolean>>;
  prefilledInfo: any;
  setPrefilledInfo: React.Dispatch<React.SetStateAction<any>>;
  prefilledPayment: string | undefined;
  setPrefilledPayment: React.Dispatch<React.SetStateAction<string | undefined>>;
  viewMode: 'store' | 'chat';
  setViewMode: React.Dispatch<React.SetStateAction<'store' | 'chat'>>;
  desktopMode: 'ai' | 'browse';
  setDesktopMode: React.Dispatch<React.SetStateAction<'ai' | 'browse'>>;
  isVoiceMode: boolean;
  setIsVoiceMode: React.Dispatch<React.SetStateAction<boolean>>;
  chatWidth: number;
  setChatWidth: React.Dispatch<React.SetStateAction<number>>;
  storeScrollRef: React.RefObject<HTMLDivElement | null>;
  desktopStoreScrollRef: React.RefObject<HTMLDivElement | null>;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isResizing: React.MutableRefObject<boolean>;
  handleCheckoutClick: () => void;
  handleSelectProduct: (product: any) => void;
  voiceChat: ReturnType<typeof useVoiceChat>;
  handleVoiceAction: (action: 'start' | 'end' | 'toggleMute' | 'toggleSpeaker') => void;
};

const StorefrontUIContext = createContext<StorefrontUIContextValue | null>(null);

export function StorefrontUIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { subdomain, currentUser, consumerEmail, setInteractionStage, columns } = useStoreSessionContext();
  const { merchant, allProducts, categories, discounts } = useStoreDataContext();
  const {
    cart,
    addToCart,
    updateQuantity,
    applyCouponCode,
  } = useStoreCartContext();
  const {
    messages,
    uiMessages,
    setMessages,
    setIsTyping,
    setAiLayout,
    ensureConversation,
    saveMessage,
  } = useStoreChatContext();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [prefilledInfo, setPrefilledInfo] = useState<any>(null);
  const [prefilledPayment, setPrefilledPayment] = useState<string | undefined>(undefined);
  const [openCheckoutAfterLogin, setOpenCheckoutAfterLogin] = useState(false);
  const [viewMode, setViewMode] = useState<'store' | 'chat'>('store');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [desktopMode, setDesktopMode] = useState<'ai' | 'browse'>('ai');
  const [chatWidth, setChatWidth] = useState(28);

  const storeScrollRef = useRef<HTMLDivElement>(null);
  const desktopStoreScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const productState = useStorefrontProducts(
    allProducts,
    categories,
    columns,
    searchQuery,
    selectedCategory,
    merchant?.branding_settings || {}
  );

  const handleCheckoutClick = useCallback(() => {
    if (!currentUser) {
      setOpenCheckoutAfterLogin(true);
      setIsLoginOpen(true);
      toast.info('Please login to continue to checkout');
      return;
    }

    setIsCheckoutOpen(true);
  }, [currentUser, setIsLoginOpen, setIsCheckoutOpen, setOpenCheckoutAfterLogin]);

  const handleSelectProduct = useCallback((product: any) => {
    router.push(`/store/${subdomain}/product/${product.id}`);
  }, [router, subdomain]);

  const voiceChat = useVoiceChat({
    subdomain,
    cart,
    products: allProducts,
    discounts,
    userEmail: currentUser?.email || consumerEmail,
    onAddToCart: (product) => addToCart(product),
    onRemoveFromCart: (id) => updateQuantity(id, 0),
    onApplyCoupon: (code) => applyCouponCode(code),
    messages: uiMessages,
    setMessages,
    setIsTyping,
    onSaveMessage: async (sender, text) => {
      const conversationId = await ensureConversation();
      if (conversationId) {
        saveMessage(sender, text, conversationId);
      }
    },
    onLayoutUpdate: setAiLayout,
    onSelectProduct: handleSelectProduct,
    onCloseProduct: () => {},
    onOpenCart: () => router.push(`/store/${subdomain}/cart`),
    onCheckout: () => handleCheckoutClick(),
    onTriggerAuth: (reason) => {
      setIsLoginOpen(true);
      if (reason) {
        toast.info(reason);
      }
    },
    onStartCheckout: (customerInfo, paymentMethod) => {
      setPrefilledInfo(customerInfo || null);
      setPrefilledPayment(paymentMethod || undefined);
      setIsCheckoutOpen(true);
    },
  });

  const handleVoiceAction = useCallback((action: 'start' | 'end' | 'toggleMute' | 'toggleSpeaker') => {
    switch (action) {
      case 'start':
        voiceChat.startSession();
        break;
      case 'end':
        voiceChat.endSession();
        setIsVoiceMode(false);
        break;
      case 'toggleMute':
        voiceChat.toggleMute();
        break;
      case 'toggleSpeaker':
        voiceChat.toggleSpeaker();
        break;
    }
  }, [voiceChat]);

  useEffect(() => {
    if (isVoiceMode) {
      setViewMode('chat');
    }
  }, [isVoiceMode]);

  useEffect(() => {
    if (voiceChat.isConnected) {
      setIsVoiceMode(true);
      setViewMode('chat');
      setInteractionStage('active');
      return;
    }

    setIsVoiceMode(false);
  }, [setInteractionStage, voiceChat.isConnected]);

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
  }, []);

  const navCategories = useMemo(() => {
    if (!searchQuery) {
      return categories;
    }

    return categories.filter((category) =>
      productState.filteredProducts.some((product) => product.category_id === category.id || product.category === category.name)
    );
  }, [categories, productState.filteredProducts, searchQuery]);

  return (
    <StorefrontUIContext.Provider
      value={{
        ...productState,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        navCategories,
        isCartOpen,
        setIsCartOpen,
        isLoginOpen,
        setIsLoginOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        openCheckoutAfterLogin,
        setOpenCheckoutAfterLogin,
        prefilledInfo,
        setPrefilledInfo,
        prefilledPayment,
        setPrefilledPayment,
        viewMode,
        setViewMode,
        desktopMode,
        setDesktopMode,
        isVoiceMode,
        setIsVoiceMode,
        chatWidth,
        setChatWidth,
        storeScrollRef,
        desktopStoreScrollRef,
        chatScrollRef,
        containerRef,
        isResizing,
        handleCheckoutClick,
        handleSelectProduct,
        voiceChat,
        handleVoiceAction,
      }}
    >
      {children}
    </StorefrontUIContext.Provider>
  );
}

export function useStorefrontUIContext() {
  const context = useContext(StorefrontUIContext);
  if (!context) {
    throw new Error('useStorefrontUIContext must be used within StorefrontUIProvider');
  }
  return context;
}
