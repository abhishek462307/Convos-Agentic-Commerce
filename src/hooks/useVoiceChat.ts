"use client"

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Product, Discount, CartItem } from '@/types';
import type { StorefrontUIMessage } from '@/types/storefront/ai';

const isDev = process.env.NODE_ENV === 'development';

interface VoiceWSMessage {
  type: string;
  transcript?: string;
  delta?: string;
  error?: { message?: string };
  name?: string;
  arguments?: string;
  call_id?: string;
  [key: string]: unknown;
}

interface VoiceSession {
  wsUrl: string;
  wsToken: string;
  sessionConfig?: Record<string, unknown>;
  merchant?: { name: string };
  [key: string]: unknown;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
const vcLog = (...args: unknown[]) => { if (isDev) console.log(...args); };
const vcError = (...args: unknown[]) => { console.error(...args); };

interface UseVoiceChatProps {
  subdomain: string;
  cart: CartItem[];
  products: Product[];
  discounts: Discount[];
  userEmail?: string | null;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: string) => void;
  onApplyCoupon: (code: string) => void;
  messages: StorefrontUIMessage[];
  setMessages: React.Dispatch<React.SetStateAction<StorefrontUIMessage[]>>;
  setIsTyping: (isTyping: boolean) => void;
  onSaveMessage?: (sender: string, text: string) => void;
  onLayoutUpdate?: (layout: Record<string, unknown>) => void;
  onSelectProduct?: (product: Product) => void;
  onCloseProduct?: () => void;
  onOpenCart?: () => void;
  onCheckout?: () => void;
  onTriggerAuth?: (reason?: string) => void;
  onStartCheckout?: (customerInfo?: Record<string, string>, paymentMethod?: string) => void;
}

export function useVoiceChat({
  subdomain,
  cart,
  products,
  discounts,
  userEmail,
  onAddToCart,
  onRemoveFromCart,
  onApplyCoupon,
  messages,
  setMessages,
  setIsTyping,
  onSaveMessage,
  onLayoutUpdate,
  onSelectProduct,
  onCloseProduct,
  onOpenCart,
  onCheckout,
  onTriggerAuth,
  onStartCheckout
}: UseVoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  
  const currentAssistantMsgIdRef = useRef<string | null>(null);
  const currentAssistantTextRef = useRef<string>('');
  const pendingMetadataRef = useRef<any>(null);

  const productsRef = useRef(products);
  const discountsRef = useRef(discounts);
  const cartRef = useRef(cart);
  const bargainedPricesRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  
  useEffect(() => {
    discountsRef.current = discounts;
  }, [discounts]);
  
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const isSpeakerOnRef = useRef(isSpeakerOn);
  useEffect(() => {
    isSpeakerOnRef.current = isSpeakerOn;
  }, [isSpeakerOn]);

  const isSpeakingRef = useRef(false);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const initializeSession = async () => {
    try {
      setIsConnecting(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ subdomain, email: userEmail })
      });

      if (!response.ok) throw new Error('Failed to initialize voice session');
      
      const data = await response.json();
      setSessionData(data);
      return data;
    } catch (error) {
      vcError('Session init error:', error);
      toast.error('Failed to start voice session');
      setIsConnecting(false);
      return null;
    }
  };

  const handleWebSocketMessage = useCallback((message: VoiceWSMessage, session: VoiceSession) => {
    switch (message.type) {
      case 'session.created':
      case 'session.updated':
        vcLog('Session ready');
        setIsConnected(true);
        setIsConnecting(false);
        break;

      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        currentAssistantMsgIdRef.current = null;
        currentAssistantTextRef.current = '';
        break;

      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        setIsTyping(true);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          const userMsgId = `user-voice-${Date.now()}`;
          setMessages(prev => [...prev, {
            id: userMsgId,
            role: 'user',
            parts: [{ type: 'text', text: message.transcript || '', state: 'done' }],
          } as StorefrontUIMessage]);
          onSaveMessage?.('user', message.transcript || '');
        }
        break;

      case 'response.audio_transcript.delta':
        if (message.delta) {
          setIsTyping(false);
          if (!currentAssistantMsgIdRef.current) {
            currentAssistantMsgIdRef.current = `assistant-voice-${Date.now()}`;
            currentAssistantTextRef.current = message.delta;
            setMessages(prev => [...prev, {
              id: currentAssistantMsgIdRef.current!,
              role: 'assistant',
              parts: [{ type: 'text', text: currentAssistantTextRef.current, state: 'streaming' }],
            } as StorefrontUIMessage]);
          } else {
            currentAssistantTextRef.current += message.delta;
            const msgId = currentAssistantMsgIdRef.current;
            const text = currentAssistantTextRef.current;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text } : m));
          }
        }
        break;

        case 'response.audio_transcript.done':
          if (message.transcript) {
            const msgId = currentAssistantMsgIdRef.current;
            const pendingMeta = pendingMetadataRef.current;
            vcLog('[Voice] Transcript done, pendingMeta:', pendingMeta, 'msgId:', msgId);
            if (msgId) {
              setMessages(prev => prev.map(m => {
                if (m.id === msgId) {
                  const mergedMeta = { ...m.metadata, ...pendingMeta };
                  vcLog('[Voice] Updating message with metadata:', mergedMeta);
                  return { ...m, text: message.transcript || '', metadata: mergedMeta } as StorefrontUIMessage;
                }
                return m;
              }));
            } else {
              setMessages(prev => [...prev, {
                id: `assistant-voice-done-${Date.now()}`,
                role: 'assistant',
                parts: [{ type: 'text', text: message.transcript || '', state: 'done' }],
                metadata: pendingMeta,
              } as StorefrontUIMessage]);
            }
            onSaveMessage?.('system', message.transcript || '');
            currentAssistantMsgIdRef.current = null;
            currentAssistantTextRef.current = '';
            pendingMetadataRef.current = null;
          }
          setIsTyping(false);
          break;

      case 'response.audio.delta':
        if (message.delta && isSpeakerOnRef.current) {
          const audioData = base64ToInt16Array(message.delta);
          audioQueueRef.current.push(audioData);
          playAudioQueue();
        }
        break;

      case 'response.audio.done':
        setIsSpeaking(false);
        setIsTyping(false);
        break;

      case 'response.function_call_arguments.done':
        handleFunctionCall(message, session);
        break;

      case 'error':
        vcError('Realtime API error:', message.error);
        toast.error(message.error?.message || 'Voice chat error');
        setIsTyping(false);
        break;
    }
  }, [setMessages, setIsTyping, onSaveMessage]);

  const handleFunctionCall = async (message: VoiceWSMessage, session: VoiceSession) => {
    const { name, arguments: argsStr, call_id } = message;
    vcLog('[Voice] Function call:', name, 'args:', argsStr);
    
    const currentProducts = productsRef.current;
    const currentDiscounts = discountsRef.current;
    const currentCart = cartRef.current;
    
    vcLog('[Voice] Available products count:', currentProducts.length);
    
    try {
      const args = JSON.parse(argsStr || '{}');
      let result: Record<string, unknown> = {};

        switch (name) {
          case 'search_products':
            const query = args.query?.toLowerCase() || '';
            const category = args.category?.toLowerCase();
            const queryWords = query.split(/\s+/).filter((w: string) => w.length > 2);
            
            vcLog('[Voice] Searching products with query:', query, 'words:', queryWords);
            vcLog('[Voice] Products to search:', currentProducts.length, 'products');
            
            const scoredProducts = currentProducts.map(p => {
              const pName = p.name?.toLowerCase() || '';
              const pDesc = p.description?.toLowerCase() || '';
              const pCat = p.category?.toLowerCase() || '';
              let score = 0;
              let matchedWords = 0;
              
              const stemmedQuery = query.replace(/s$/, '').replace(/ies$/, 'y').replace(/ing$/, '');
              
              if (pName.includes(query) || pName.includes(stemmedQuery)) score += 20;
              if (pCat === query || pCat === stemmedQuery) score += 15;
              if (pCat.includes(query) || pCat.includes(stemmedQuery)) score += 10;
              if (pDesc.includes(query) || pDesc.includes(stemmedQuery)) score += 5;
              
              for (const word of queryWords) {
                if (word.length < 3) continue;
                const stemmedWord = word.replace(/s$/, '').replace(/ies$/, 'y').replace(/ing$/, '');
                
                if (pName.includes(word) || pName.includes(stemmedWord)) {
                  score += 8;
                  matchedWords++;
                }
                if (pCat.includes(word) || pCat.includes(stemmedWord)) {
                  score += 6;
                  matchedWords++;
                }
                if (pDesc.includes(word) || pDesc.includes(stemmedWord)) {
                  score += 2;
                  matchedWords++;
                }
              }
              
              if (queryWords.length > 1 && matchedWords >= queryWords.length) {
                score += 10;
              }
              
              if (category && (pCat.includes(category) || pCat.includes(category.replace(/s$/, '')))) {
                score += 8;
              }
              
              return { ...p, score, matchedWords };
            });
            
            let matchedProducts = scoredProducts
              .filter(p => p.score > 0)
              .sort((a, b) => {
                if (b.matchedWords !== a.matchedWords) return b.matchedWords - a.matchedWords;
                return b.score - a.score;
              })
              .slice(0, 6);
              
              vcLog('[Voice] Matched products:', matchedProducts.length, matchedProducts.map(p => p.name));
              
              result = {
                found: matchedProducts.length,
                products: matchedProducts.map(p => ({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  category: p.category
                }))
              };
  
                if (matchedProducts.length > 0) {
                  vcLog('[Voice] search_products found:', matchedProducts.length, 'products');
                  pendingMetadataRef.current = { ...pendingMetadataRef.current, products: matchedProducts };
                  
                  // Update layout on right side for web split-view
                  onLayoutUpdate?.({
                    sections: [{
                      type: 'product_grid',
                      title: 'You may also like',
                      products: matchedProducts
                    }]
                  });
  
                  const msgId = currentAssistantMsgIdRef.current;
                vcLog('[Voice] Current assistant msgId:', msgId);
                if (msgId) {
                  setMessages(prev => prev.map(m => 
                    m.id === msgId ? { ...m, metadata: { ...m.metadata, products: matchedProducts } } as StorefrontUIMessage : m
                  ));
                }
              } else {
                vcLog('[Voice] search_products found no products for query:', query);
              }
              break;

          case 'view_product_details':
            vcLog('[Voice] view_product_details called:', args.productId);
            const productToView = currentProducts.find(p => p.id === args.productId);
            if (productToView) {
              onSelectProduct?.(productToView);
              result = { success: true, message: `Opened details for ${productToView.name}` };
            } else {
              result = { success: false, message: 'Product not found' };
            }
            break;

          case 'close_product_details':
            vcLog('[Voice] close_product_details called');
            onCloseProduct?.();
            result = { success: true, message: 'Closed product details popup' };
            break;

          case 'open_cart':
            vcLog('[Voice] open_cart called');
            onOpenCart?.();
            result = { success: true, message: 'Opened the shopping cart' };
            break;

          case 'checkout':
          case 'start_checkout':
            vcLog('[Voice] start_checkout called:', args);
            onStartCheckout?.(args.customerInfo, args.paymentMethod);
            result = { success: true, message: 'Checkout initiated with pre-filled details' };
            break;

          case 'check_auth_status':
            vcLog('[Voice] check_auth_status called');
            result = { 
              isAuthenticated: !!userEmail, 
              user: userEmail ? { email: userEmail } : null 
            };
            break;

          case 'send_login_link':
            vcLog('[Voice] send_login_link called:', args.email);
            try {
              const res = await fetch('/api/store/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  action: 'send_magic_link', 
                  email: args.email, 
                  subdomain 
                })
              });
              const data = await res.json();
              result = { success: data.success, message: data.message || (data.success ? 'Login link sent!' : 'Failed to send link') };
              if (data.success) toast.success('Login link sent to ' + args.email);
            } catch (err: unknown) {
              result = { success: false, error: getErrorMessage(err) };
            }
            break;

          case 'generate_direct_payment_link':
            vcLog('[Voice] generate_direct_payment_link called:', args);
            try {
              const res = await fetch('/api/ai/payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subdomain,
                  cart: currentCart,
                  customerInfo: args.customerInfo,
                  bargainedPrices: bargainedPricesRef.current
                })
              });
              const data = await res.json();
              if (data.success) {
                result = { success: true, paymentUrl: data.paymentUrl, orderId: data.orderId };
                toast.success('Payment link generated!');
                // Add to messages
                const msgIdPay = currentAssistantMsgIdRef.current;
                if (msgIdPay) {
                  setMessages(prev => prev.map(m => 
                    m.id === msgIdPay ? { ...m, metadata: { ...m.metadata, payment_link_generated: true, paymentUrl: data.paymentUrl, total: data.total } } as StorefrontUIMessage : m
                  ));
                }
                // Open the link in a new tab if it's high trust or explicitly requested? 
                // For voice, better to just show it in the chat UI.
              } else {
                result = { success: false, error: data.error };
              }
            } catch (err: unknown) {
              result = { success: false, error: getErrorMessage(err) };
            }
            break;

          case 'get_order_status':
            vcLog('[Voice] get_order_status called:', args);
            try {
              const res = await fetch('/api/orders/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: args.email, orderId: args.orderId })
              });
              const data = await res.json();
              result = data;
            } catch (err: unknown) {
              result = { success: false, error: getErrorMessage(err) };
            }
            break;

          case 'request_refund_or_return':
            vcLog('[Voice] request_refund_or_return called:', args);
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData.session?.access_token;
              const res = await fetch('/api/orders/refund', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({ 
                  orderId: args.orderId, 
                  reason: args.reason, 
                  subdomain,
                  email: userEmail 
                })
              });
              const data = await res.json();
              result = data;
              if (data.success) toast.success('Refund request submitted!');
            } catch (err: unknown) {
              result = { success: false, error: getErrorMessage(err) };
            }
            break;

          case 'apply_loyalty_reward':
            vcLog('[Voice] apply_loyalty_reward called:', args);
            try {
              const res = await fetch('/api/ai/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'apply_loyalty_reward',
                  data: args,
                  subdomain
                })
              });
              const data = await res.json();
              result = data;
              if (data.success) {
                toast.success('Loyalty reward applied!');
                // Update discounts in ref to ensure it's available
                if (data.reward?.code) {
                  const rewardValue = Number(data.reward.value);
                  const finalValue = Number.isFinite(rewardValue) ? rewardValue : 15;
                  const newDiscount: Discount = {
                    id: `voice-reward-${Date.now()}`,
                    merchant_id: '',
                    code: data.reward.code as string,
                    type: 'percentage',
                    value: finalValue,
                    is_active: true
                  };
                  discountsRef.current = [...discountsRef.current, newDiscount];
                }
              }
            } catch (err: unknown) {
              result = { success: false, error: getErrorMessage(err) };
            }
            break;


          case 'show_suggestion_buttons':
            vcLog('[Voice] show_suggestion_buttons called:', args.options);
            if (args.options) {
              pendingMetadataRef.current = { ...pendingMetadataRef.current, suggestionButtons: args.options };
              const msgIdSugg = currentAssistantMsgIdRef.current;
              if (msgIdSugg) {
                setMessages(prev => prev.map(m => 
                    m.id === msgIdSugg ? { ...m, metadata: { ...m.metadata, suggestionButtons: args.options } } as StorefrontUIMessage : m
                  ));
              }
            }
            result = { success: true, message: 'Suggestion buttons displayed' };
            break;

          case 'set_bargained_price':
          const bargainProductId = args.productId;
          const agreedPrice = args.agreedPrice;
          vcLog('[Voice] set_bargained_price called:', bargainProductId, agreedPrice);
          
          if (bargainProductId && agreedPrice) {
            bargainedPricesRef.current[bargainProductId] = agreedPrice;
            result = { 
              success: true, 
              message: `Bargained price of ${agreedPrice} set for ${args.productName}. Ready to add to cart!` 
            };
            toast.success(`Deal! ${args.productName} at ${agreedPrice}`);
          } else {
            result = { success: false, message: 'Invalid bargain parameters' };
          }
          break;

        case 'add_to_cart':
          const productToAdd = currentProducts.find(p => p.id === args.productId);
          if (productToAdd) {
            const bargainedPrice = bargainedPricesRef.current[args.productId];
            const finalProduct = bargainedPrice 
              ? { ...productToAdd, bargainedPrice: bargainedPrice, quantity: args.quantity || 1 }
              : { ...productToAdd, quantity: args.quantity || 1 };
            
            vcLog('[Voice] Adding to cart:', finalProduct.name, 'price:', finalProduct.price, 'bargainedPrice:', bargainedPrice || 'none');
            onAddToCart(finalProduct);
            
            if (bargainedPrice) {
              delete bargainedPricesRef.current[args.productId];
            }
            
            result = { success: true, message: `Added ${productToAdd.name} to cart${bargainedPrice ? ` at bargained price` : ''}` };
            pendingMetadataRef.current = { ...pendingMetadataRef.current, showCartButtons: true };
            const msgIdCart = currentAssistantMsgIdRef.current;
            if (msgIdCart) {
              setMessages(prev => prev.map(m => 
                    m.id === msgIdCart ? { ...m, metadata: { ...m.metadata, showCartButtons: true } } as StorefrontUIMessage : m
                  ));
            }
          } else {
            result = { success: false, message: 'Product not found' };
          }
          break;

        case 'remove_from_cart':
          onRemoveFromCart(args.productId);
          result = { success: true, message: 'Removed from cart' };
          break;

        case 'get_cart_summary':
          const cartTotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          result = {
            items: currentCart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
            itemCount: currentCart.reduce((sum, item) => sum + item.quantity, 0),
            total: cartTotal
          };
          break;

          case 'check_discounts':
            vcLog('[Voice] check_discounts called, available discounts:', currentDiscounts.length);
            const availableDiscounts = currentDiscounts.filter(d => d.is_active !== false);
            result = {
              found: availableDiscounts.length,
              discounts: availableDiscounts.map(d => ({
                code: d.code,
                type: d.type,
                value: d.value,
                description: d.description || `${d.type === 'percentage' ? `${d.value}% off` : `$${d.value} off`}`
              }))
            };
            
            if (availableDiscounts.length > 0) {
              pendingMetadataRef.current = { ...pendingMetadataRef.current, discounts: availableDiscounts };
              const msgIdDiscount = currentAssistantMsgIdRef.current;
              if (msgIdDiscount) {
                setMessages(prev => prev.map(m => 
                    m.id === msgIdDiscount ? { ...m, metadata: { ...m.metadata, discounts: availableDiscounts } } as StorefrontUIMessage : m
                  ));
              }
            }
            break;

          case 'apply_coupon':
              vcLog('[Voice] apply_coupon called with code:', args.code);
              const couponCode = args.code?.toUpperCase();
              const matchedDiscount = currentDiscounts.find(d => d.code?.toUpperCase() === couponCode && d.is_active !== false);
              
              if (matchedDiscount) {
                onApplyCoupon(matchedDiscount.code);
                result = { 
                  success: true, 
                  message: `Applied coupon ${matchedDiscount.code}`,
                  discount: {
                    code: matchedDiscount.code,
                    type: matchedDiscount.type,
                    value: matchedDiscount.value
                  }
                };
                toast.success(`Coupon ${matchedDiscount.code} applied!`);
              } else {
                result = { 
                  success: false, 
                  message: `Coupon code "${args.code}" is not valid or has expired` 
                };
              }
              break;

          case 'upsert_customer_intent':
            vcLog('[Voice] upsert_customer_intent called:', args);
            try {
              const res = await fetch('/api/ai/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'upsert_customer_intent',
                  data: args,
                  subdomain
                })
              });
              const data = await res.json();
                if (data.success) {
                  result = { success: true, intentId: data.intent.id };
                  toast.success('Mission started!');
                  // Update messages to show mission status
                  const msgIdIntent = currentAssistantMsgIdRef.current;
                  if (msgIdIntent) {
                    setMessages(prev => prev.map(m => 
                      m.id === msgIdIntent ? { ...m, metadata: { ...m.metadata, intents: [data.intent], missionFeedback: 'Mission Started!' } } as StorefrontUIMessage : m
                    ));
                  }
                } else {
                  result = { success: false, error: data.error };
                }
            } catch (err: unknown) {
              result = { success: false, error: getErrorMessage(err) };
            }
            break;

          case 'create_agent_plan':
            vcLog('[Voice] create_agent_plan called:', args);
            try {
              const res = await fetch('/api/ai/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'create_agent_plan',
                  data: args,
                  subdomain
                })
              });
              const data = await res.json();
              if (data.success) {
                result = { success: true, planId: data.plan.id };
                // Update messages to show plan status
                const msgIdPlan = currentAssistantMsgIdRef.current;
                if (msgIdPlan) {
                  setMessages(prev => prev.map(m => 
                    m.id === msgIdPlan ? { ...m, metadata: { ...m.metadata, plans: [data.plan] } } as StorefrontUIMessage : m
                  ));
                }
              } else {
                result = { success: false, error: data.error };
              }
            } catch (err: unknown) {
              result = { success: false, error: getErrorMessage(err) };
            }
            break;

          case 'update_agent_memory':
            vcLog('[Voice] update_agent_memory called:', args);
            try {
              await fetch('/api/ai/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'update_agent_memory',
                  data: args,
                  subdomain
                })
              });
              result = { success: true };
            } catch (err: unknown) {
              result = { success: false, error: getErrorMessage(err) };
            }
            break;
          }


        if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: call_id,
            output: JSON.stringify(result)
          }
        }));

        wsRef.current.send(JSON.stringify({
          type: 'response.create'
        }));
      }
    } catch (error) {
      vcError('Function call error:', error);
    }
  };

  const base64ToInt16Array = (base64: string): Int16Array => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Ensure we have an even number of bytes for Int16Array
      const length = Math.floor(bytes.length / 2) * 2;
      return new Int16Array(bytes.buffer.slice(0, length));
    } catch (e) {
      vcError('[Voice] Failed to decode base64 audio:', e);
      return new Int16Array(0);
    }
  };

  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!;
      await playAudioChunk(audioData);
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  };

  const playAudioChunk = (int16Data: Int16Array): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 24000 });
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768;
        }

        const buffer = ctx.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => resolve();
        source.start();
      } catch (e) {
        vcError('[Voice] Playback error:', e);
        resolve();
      }
    });
  };

  const connectWebSocket = async (session: VoiceSession) => {
    return new Promise<WebSocket>((resolve, reject) => {
      try {
        if (!session.wsToken) {
          reject(new Error('Missing voice session token'));
          return;
        }
          const wsUrl = `${session.wsUrl}${session.wsUrl.includes('?') ? '&' : '?'}api-key=${encodeURIComponent(session.wsToken)}`;
        vcLog('[Voice] Connecting to WebSocket at:', session.wsUrl);
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          vcLog('[Voice] WebSocket connected');
          ws.send(JSON.stringify({
            type: 'session.update',
            session: session.sessionConfig
          }));
          resolve(ws);
        };

        ws.onerror = (error) => {
          vcError('[Voice] WebSocket error:', error);
          reject(error);
        };

        ws.onclose = (event) => {
          vcLog('[Voice] WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          setIsListening(false);
          setIsTyping(false);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data, session);
          } catch (e) {
            vcError('[Voice] Failed to parse WebSocket message:', e);
          }
        };

        wsRef.current = ws;
      } catch (e) {
        vcError('[Voice] WebSocket setup error:', e);
        reject(e);
      }
    });
  };

    const startMicrophone = async () => {
      try {
        vcLog('[Voice] Starting microphone...');
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Microphone access is not supported in this browser or context (requires HTTPS)');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        mediaStreamRef.current = stream;

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 24000 });
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const source = ctx.createMediaStreamSource(stream);
        
        const highpassFilter = ctx.createBiquadFilter();
        highpassFilter.type = 'highpass';
        highpassFilter.frequency.value = 85;
        highpassFilter.Q.value = 0.7;
        
        const lowpassFilter = ctx.createBiquadFilter();
        lowpassFilter.type = 'lowpass';
        lowpassFilter.frequency.value = 8000;
        lowpassFilter.Q.value = 0.7;
        
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.15;
        
        source.connect(highpassFilter);
        highpassFilter.connect(lowpassFilter);
        lowpassFilter.connect(compressor);
        
        const processor = ctx.createScriptProcessor(2048, 1, 1);

        let consecutiveSilentFrames = 0;
        const SILENT_FRAMES_THRESHOLD = 5;
        let noiseFloor = 0.012;
        let noiseSamples: number[] = [];
        const NOISE_SAMPLE_SIZE = 20;
        
        processor.onaudioprocess = (event) => {
          if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          if (isSpeakingRef.current) return;

          const inputData = event.inputBuffer.getChannelData(0);
          
          let sum = 0;
          let maxVal = 0;
          let rms = 0;
          
          for (let i = 0; i < inputData.length; i++) {
            const absVal = Math.abs(inputData[i]);
            sum += absVal;
            rms += inputData[i] * inputData[i];
            if (absVal > maxVal) maxVal = absVal;
          }
          
          const avgVolume = sum / inputData.length;
          rms = Math.sqrt(rms / inputData.length);
          
          if (noiseSamples.length < NOISE_SAMPLE_SIZE && avgVolume < 0.03) {
            noiseSamples.push(avgVolume);
            if (noiseSamples.length === NOISE_SAMPLE_SIZE) {
              noiseFloor = Math.max(0.01, (noiseSamples.reduce((a, b) => a + b) / NOISE_SAMPLE_SIZE) * 1.5);
            }
          }
          
          const dynamicThreshold = Math.max(noiseFloor, 0.01);
          const hasAudio = rms > dynamicThreshold || maxVal > 0.05;
          
          if (!hasAudio) {
            consecutiveSilentFrames++;
            if (consecutiveSilentFrames >= SILENT_FRAMES_THRESHOLD) return;
          } else {
            consecutiveSilentFrames = 0;
          }
          
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }

          // Use a more efficient way to convert Int16Array to base64
          const buffer = int16Data.buffer;
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i += 1024) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 1024)));
          }
          const base64 = btoa(binary);
          
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64
          }));
        };

        compressor.connect(processor);
        processor.connect(ctx.destination);
        processorRef.current = processor;

      } catch (error) {
        vcError('[Voice] Microphone error:', error);
        toast.error('Failed to access microphone');
      }
    };

  const startSession = async () => {
    const session = await initializeSession();
    if (!session) return;

    try {
      await connectWebSocket(session);
      await startMicrophone();
      
      setMessages(prev => {
        const hasWelcome = prev.some(m => m.id === 'welcome-voice-session');
        if (hasWelcome) return prev;
        return [...prev, {
          id: 'welcome-voice-session',
          role: 'assistant',
          parts: [{ type: 'text', text: `Voice mode live! 🎙️ I'm your sales expert for ${session.merchant?.name || 'this store'}. Let's find you something amazing!`, state: 'done' }],
        } as StorefrontUIMessage];
      });
    } catch (error) {
      vcError('Session start error:', error);
      toast.error('Failed to start voice chat');
      setIsConnecting(false);
    }
  };

  const endSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    setIsConnected(false);
    setIsConnecting(false);
    setIsListening(false);
    setIsSpeaking(false);
    setIsTyping(false);
    currentAssistantMsgIdRef.current = null;
    currentAssistantTextRef.current = '';
  }, [setIsTyping]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
  }, []);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    isSpeakerOn,
    isListening,
    isSpeaking,
    startSession,
    endSession,
    toggleMute,
    toggleSpeaker,
    voiceState: {
      isConnected,
      isConnecting,
      isMuted,
      isSpeakerOn,
      isListening,
      isSpeaking
    }
  };
}
