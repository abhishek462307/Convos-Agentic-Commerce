"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { StorefrontSkeleton } from '@/components/StoreSkeletons';
import { StorefrontSections } from './components/StorefrontSections';
import { StorefrontOverlays } from './components/StorefrontOverlays';
import { StorefrontError } from './components/StorefrontError';
import { StorefrontResponsiveLayout } from './components/StorefrontResponsiveLayout';

// Hook imports
import { useStorefrontViewport } from '@/hooks/storefront/useStorefrontViewport';
import { useStorefrontAuth } from '@/hooks/storefront/useStorefrontAuth';
import { useStoreCoupon } from '@/hooks/storefront/useStoreCoupon';
import { useStorefrontCart } from '@/hooks/storefront/useStorefrontCart';
import { useStorefrontData } from '@/hooks/storefront/useStorefrontData';
import { useStorefrontChat } from '@/hooks/storefront/useStorefrontChat';
import { useStorefrontProducts } from '@/hooks/storefront/useStorefrontProducts';
import { useStorefrontRealtime } from '@/hooks/storefront/useStorefrontRealtime';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { getStorefrontPath } from '@/lib/storefront/navigation';

import { Package, Sparkles, Percent } from 'lucide-react';
import type { AppliedCoupon, Product } from '@/types';

export default function StorefrontClient({ subdomain }: { subdomain: string }) {
  const router = useRouter();
  
  // 1. Core Store Data & Auth
  const { 
    merchant, allProducts, categories, discounts, template, loading, 
    storeLoadError, loaderConfig, welcomeMessage, initialMessages, fetchStoreData 
  } = useStorefrontData(subdomain);

  const { isDesktop, columns } = useStorefrontViewport();
  const { 
    currentUser, setCurrentUser, consumerEmail, setConsumerEmail, 
    sessionId, interactionStage, setInteractionStage 
  } = useStorefrontAuth(subdomain);

  // 2. Cart & Promotions
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const couponBootstrap = useStoreCoupon({
    subdomain,
    cart: [],
    appliedCoupon,
    setAppliedCoupon,
  });

  const {
    cart, setCart, subtotal, bargainSavings,
    discount, total, hasBargainedItems, cartItemById, addToCart, updateQuantity,
    handleCartActions, showAddedToCart, setShowAddedToCart, lastAddedItems
  } = useStorefrontCart(subdomain, merchant, sessionId, consumerEmail, allProducts, appliedCoupon, couponBootstrap.applyCouponCode);

  const { applyCouponCode } = useStoreCoupon({
    subdomain,
    cart,
    appliedCoupon,
    setAppliedCoupon,
  });

  // 3. AI & Chat Logic
  const {
    messages, uiMessages, setMessages, inputText, setInputText, isTyping, setIsTyping,
    isListening, aiUnavailable, aiLayout, setAiLayout, conversationId,
    handleSendMessage, toggleListening, clearChat, saveMessage, ensureConversation
  } = useStorefrontChat({
    subdomain, merchant, sessionId, currentUserEmail: currentUser?.email || null,
    consumerEmail, setConsumerEmail, cart, appliedCoupon,
    onHandleCartActions: handleCartActions, initialMessages, welcomeMessage
  });

  // 4. Products & Category View Logic
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    filteredProducts, visibleCategoryRows, canLoadMoreRows, handleLoadMoreRows, trustCues 
  } = useStorefrontProducts(allProducts, categories, columns, searchQuery, selectedCategory, merchant?.branding_settings || {});

  // 5. Realtime Sync
  useStorefrontRealtime(merchant?.id, consumerEmail);

  // 6. UI State
  const [couponInput, setCouponInput] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [prefilledInfo, setPrefilledInfo] = useState<Record<string, string> | null>(null);
  const [prefilledPayment, setPrefilledPayment] = useState<string | undefined>(undefined);
  const [openCheckoutAfterLogin, setOpenCheckoutAfterLogin] = useState(false);
  const [viewMode, setViewMode] = useState<'store' | 'chat'>('store');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [desktopMode, setDesktopMode] = useState<'ai' | 'browse'>('ai');
  const [chatWidth, setChatWidth] = useState(28);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const storeScrollRef = useRef<HTMLDivElement>(null);
  const desktopStoreScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 7. Voice Chat Integration
  const voiceChat = useVoiceChat({
    subdomain, cart, products: allProducts, discounts, userEmail: currentUser?.email || consumerEmail,
    onAddToCart: (p) => addToCart(p),
    onRemoveFromCart: (id) => updateQuantity(id, 0),
    onApplyCoupon: (code) => applyCouponCode(code),
    messages: uiMessages, setMessages, setIsTyping,
    onSaveMessage: async (s, t) => {
      const cId = await ensureConversation();
      if (cId) saveMessage(s, t, cId);
    },
    onLayoutUpdate: setAiLayout,
    onSelectProduct: (p) => router.push(getStorefrontPath(subdomain, `/product/${p.id}`, window.location.host)),
    onCloseProduct: () => {},
    onOpenCart: () => router.push(getStorefrontPath(subdomain, '/cart', window.location.host)),
    onCheckout: () => handleCheckoutClick(),
    onTriggerAuth: (reason) => {
      setIsLoginOpen(true);
      if (reason) toast.info(reason);
    },
    onStartCheckout: (customerInfo, paymentMethod) => {
      setPrefilledInfo(customerInfo || null);
      setPrefilledPayment(paymentMethod || undefined);
      setIsCheckoutOpen(true);
    }
  });

  const handleVoiceAction = useCallback((action: 'start' | 'end' | 'toggleMute' | 'toggleSpeaker') => {
    switch (action) {
      case 'start': voiceChat.startSession(); break;
      case 'end': voiceChat.endSession(); setIsVoiceMode(false); break;
      case 'toggleMute': voiceChat.toggleMute(); break;
      case 'toggleSpeaker': voiceChat.toggleSpeaker(); break;
    }
  }, [voiceChat]);

  // Effects for Voice Mode synchronization
  useEffect(() => {
    if (isVoiceMode) setViewMode('chat');
  }, [isVoiceMode]);

  useEffect(() => {
    if (voiceChat.isConnected) {
      setIsVoiceMode(true);
      setViewMode('chat');
      setInteractionStage('active');
    } else {
      setIsVoiceMode(false);
    }
  }, [voiceChat.isConnected, setInteractionStage]);

  // Handle Resize Logic (Desktop)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((rect.right - e.clientX) / rect.width) * 100;
      setChatWidth(Math.min(60, Math.max(18, pct)));
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Voice Recognition Init
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognitionCtor = window.webkitSpeechRecognition || window.SpeechRecognition;
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          setInputText(event.results[0][0].transcript);
        };
        recognition.onerror = () => toast.error('Voice recognition failed.');
        recognitionRef.current = recognition;
      }
    }
  }, [setInputText]);

  const handleCheckoutClick = useCallback(() => {
    if (!currentUser) {
      setOpenCheckoutAfterLogin(true);
      setIsLoginOpen(true);
      toast.info("Please login to continue to checkout");
      return;
    }
    setIsCheckoutOpen(true);
  }, [currentUser]);

  const handleApplyCoupon = useCallback(() => {
    if (couponInput.trim()) {
      applyCouponCode(couponInput.trim()).then(() => setCouponInput(''));
    }
  }, [couponInput, applyCouponCode]);

  const navCategories = useMemo(() => {
    if (!searchQuery) return categories;
    return categories.filter(cat => filteredProducts.some(p => p.category_id === cat.id || p.category === cat.name));
  }, [categories, filteredProducts, searchQuery]);

  const StorefrontContent = useMemo(() => (
    <StorefrontSections subdomain={subdomain} />
  ), [subdomain]);

  const quickActions = [
    { label: "show me everything", icon: Package },
    { label: "what's popular?", icon: Sparkles },
    { label: "any deals today?", icon: Percent },
  ];

  if (loading) return <StorefrontSkeleton />;
  if (!merchant) return <StorefrontError errorType={storeLoadError} onRetry={fetchStoreData} />;

  const commonLayoutProps = {
    merchant, branding: merchant.branding_settings || {}, cart, aiUnavailable, storefrontContent: StorefrontContent,
    allProducts, handleSendMessage, setIsCartOpen, handleCheckoutClick, setConsumerEmail,
    inputText, setInputText, isListening, toggleListening: () => toggleListening(recognitionRef), quickActions,
    setIsLoginOpen, isVoiceMode, subdomain, chatScrollRef, isTyping
  };

  const desktopChatPanelProps = {
    ...commonLayoutProps, subdomain, merchant, conversationId, messages,
    chatWidth, cart, allProducts, discounts, currentUser, consumerEmail,
    handleSelectProduct: (p: Product) => router.push(getStorefrontPath(subdomain, `/product/${p.id}`, window.location.host)),
    setCart, setMessages, setIsTyping, setAiLayout, setIsLoginOpen,
    setPrefilledInfo, setPrefilledPayment, sessionId, setAppliedCoupon,
    onClearChat: clearChat, setInteractionStage, setViewMode, setIsCheckoutOpen,
    chatScrollRef,
  };

  const mobileLayoutProps = {
    ...commonLayoutProps, viewMode, setViewMode, storeScrollRef, setIsCheckoutOpen, isCartOpen, isCheckoutOpen
  };

  const desktopLayoutProps = {
    interactionStage, desktopMode, setDesktopMode, loaderConfig, ...commonLayoutProps,
    setIsVoiceMode, voiceChat, handleVoiceAction, searchQuery, setSearchQuery, navCategories,
    selectedCategory, setSelectedCategory, desktopStoreScrollRef, containerRef, isResizing, chatWidth,
    chatPanelProps: desktopChatPanelProps,
  };

  return (
    <div
      className="h-[100dvh] font-sans flex flex-col overflow-x-clip relative"
      style={{ background: 'var(--store-bg, #f6f6f7)', color: 'var(--store-text)' }}
    >
      <StorefrontResponsiveLayout>{StorefrontContent}</StorefrontResponsiveLayout>

      <StorefrontOverlays />
    </div>
  );
}
