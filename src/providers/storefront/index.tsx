export * from './StorefrontProviders';
export * from './StoreSessionProvider';
export * from './StoreDataProvider';
export * from './StoreCartProvider';
export * from './StoreChatProvider';
export * from './StorefrontUIProvider';

import { useStoreCartContext } from './StoreCartProvider';
import { useStoreChatContext } from './StoreChatProvider';
import { useStoreDataContext } from './StoreDataProvider';
import { useStoreSessionContext } from './StoreSessionProvider';
import { useStorefrontUIContext } from './StorefrontUIProvider';

export function useStoreData() {
  const data = useStoreDataContext();
  const session = useStoreSessionContext();
  const chat = useStoreChatContext();
  const ui = useStorefrontUIContext();

  return {
    ...data,
    searchQuery: ui.searchQuery,
    setSearchQuery: ui.setSearchQuery,
    selectedCategory: ui.selectedCategory,
    setSelectedCategory: ui.setSelectedCategory,
    navCategories: ui.navCategories,
    filteredProducts: ui.filteredProducts,
    visibleCategoryRows: ui.visibleCategoryRows,
    canLoadMoreRows: ui.canLoadMoreRows,
    handleLoadMoreRows: ui.handleLoadMoreRows,
    trustCues: ui.trustCues,
    isDesktop: session.isDesktop,
    mounted: session.mounted,
    aiUnavailable: chat.aiUnavailable,
    setAiUnavailable: chat.setAiUnavailable,
  };
}

export function useStoreCart() {
  const cart = useStoreCartContext();
  const ui = useStorefrontUIContext();

  return {
    ...cart,
    isCartOpen: ui.isCartOpen,
    setIsCartOpen: ui.setIsCartOpen,
    isCheckoutOpen: ui.isCheckoutOpen,
    setIsCheckoutOpen: ui.setIsCheckoutOpen,
    openCheckoutAfterLogin: ui.openCheckoutAfterLogin,
    setOpenCheckoutAfterLogin: ui.setOpenCheckoutAfterLogin,
    prefilledInfo: ui.prefilledInfo,
    prefilledPayment: ui.prefilledPayment,
    setPrefilledInfo: ui.setPrefilledInfo,
    setPrefilledPayment: ui.setPrefilledPayment,
    handleCheckoutClick: ui.handleCheckoutClick,
  };
}

export function useStoreChat() {
  const chat = useStoreChatContext();
  const ui = useStorefrontUIContext();

  return {
    ...chat,
    viewMode: ui.viewMode,
    setViewMode: ui.setViewMode,
    desktopMode: ui.desktopMode,
    setDesktopMode: ui.setDesktopMode,
    isVoiceMode: ui.isVoiceMode,
    setIsVoiceMode: ui.setIsVoiceMode,
    voiceChat: ui.voiceChat,
    handleVoiceAction: ui.handleVoiceAction,
    chatWidth: ui.chatWidth,
    setChatWidth: ui.setChatWidth,
    chatScrollRef: ui.chatScrollRef,
  };
}

export function useStoreSession() {
  const session = useStoreSessionContext();
  const ui = useStorefrontUIContext();

  return {
    ...session,
    isLoginOpen: ui.isLoginOpen,
    setIsLoginOpen: ui.setIsLoginOpen,
  };
}
