"use client"

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getTemplateById, type StoreTemplate } from '@/lib/store-templates';
import { PRODUCT_SELECT } from '@/lib/product-select';
import { 
  STOREFRONT_MERCHANT_SELECT,
  STOREFRONT_CATEGORY_SELECT,
  STOREFRONT_DISCOUNT_SELECT,
  resolveLoaderConfig,
  deduplicateMessages,
} from '@/lib/storefront';
import type { LoaderConfig } from '@/types/storefront';
import type { ChatMessage, Merchant, Product, Category, Discount } from '@/types';

export function useStorefrontData(subdomain: string) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [template, setTemplate] = useState<StoreTemplate | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [storeLoadError, setStoreLoadError] = useState<'not_found' | 'load_failed' | null>(null);
  const [loaderConfig, setLoaderConfig] = useState<LoaderConfig>({
    style: 'spinner',
    logoUrl: null,
    logoUrlDesktop: null,
    logoWidthMobile: 80,
    logoHeightMobile: 80,
    logoWidthDesktop: 120,
    logoHeightDesktop: 40,
    primaryColor: '#008060',
  });
  
  const welcomeMessageRef = useRef<string>('');
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const dataLoadedRef = useRef(false);

  const fetchStoreData = useCallback(async () => {
    setStoreLoadError(null);
    setLoading(true);

    try {
      const { data: merchantData } = await supabase
        .from('merchants')
        .select(STOREFRONT_MERCHANT_SELECT)
        .eq('subdomain', subdomain)
        .single();

      if (!merchantData) {
        setMerchant(null);
        setStoreLoadError('not_found');
        setLoading(false);
        return;
      }
      setMerchant(merchantData);
      
      const brandingData = (merchantData.branding_settings as any) || {};
      
      // Check for draft preview data in search params or session storage
      const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'true';
      if (isPreview) {
        const draft = sessionStorage.getItem(`store_preview_draft_${subdomain}`);
        if (draft) {
          try {
            const parsedDraft = JSON.parse(draft);
            Object.assign(brandingData, parsedDraft);
            merchantData.branding_settings = brandingData;
          } catch (e) {
            // parse error in preview draft — skip silently
          }
        }
      }

      const templateId = brandingData.template_id || 'minimal-light';
      const foundTemplate = getTemplateById(templateId);
      setTemplate(foundTemplate);
      
      setLoaderConfig(resolveLoaderConfig(brandingData));
      
      const [{ data: storeProducts }, { data: categoryData }, { data: discountData }] = await Promise.all([
        supabase.from('products').select(PRODUCT_SELECT).eq('merchant_id', merchantData.id),
        supabase.from('categories').select(STOREFRONT_CATEGORY_SELECT).eq('merchant_id', merchantData.id),
        supabase.from('discounts').select(STOREFRONT_DISCOUNT_SELECT).eq('merchant_id', merchantData.id).order('created_at', { ascending: false })
      ]);
      
      setAllProducts(storeProducts || []);
      setCategories(categoryData || []);
      setDiscounts(discountData || []);

      const welcomeMessage = brandingData.welcome_message || `hey! welcome to ${merchantData.store_name}. what are you looking for today?`;
      welcomeMessageRef.current = welcomeMessage;
      
      const savedMessages = localStorage.getItem(`chat_messages_${subdomain}`);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInitialMessages(deduplicateMessages(parsed as ChatMessage[]));
          } else {
            setInitialMessages([{ id: 'welcome', sender: 'system', text: welcomeMessage }]);
          }
        } catch {
          setInitialMessages([{ id: 'welcome', sender: 'system', text: welcomeMessage }]);
        }
      } else {
        setInitialMessages([{ id: 'welcome', sender: 'system', text: welcomeMessage }]);
      }
      
      dataLoadedRef.current = true;
      setLoading(false);
    } catch {
      setMerchant(null);
      setStoreLoadError('load_failed');
      setLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  // Listen for real-time updates via postMessage in preview mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
    if (!isPreview) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STORE_PREVIEW_UPDATE') {
        const draft = event.data.design;
        if (draft) {
          setMerchant(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              branding_settings: {
                ...(prev.branding_settings as any),
                ...draft
              }
            };
          });
          
          if (draft.template_id) {
            setTemplate(getTemplateById(draft.template_id));
          }
          
          setLoaderConfig(resolveLoaderConfig(draft));
          if (draft.welcome_message) {
            welcomeMessageRef.current = draft.welcome_message;
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [subdomain]);

  return {
    merchant,
    allProducts,
    categories,
    discounts,
    template,
    loading,
    storeLoadError,
    loaderConfig,
    welcomeMessage: welcomeMessageRef.current,
    initialMessages,
    fetchStoreData
  };
}
