"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { toast } from 'sonner';

import { sanitizeMessagesForStorage, deduplicateMessages } from '@/lib/storefront';
import type { ChatMessage } from '@/types';
import {
  storefrontMessageMetadataSchema,
  storefrontUIMessageToChatMessage,
  type StorefrontMessageMetadata,
  type StorefrontUIMessage,
} from '@/types/storefront/ai';

interface UseStorefrontChatProps {
  subdomain: string;
  merchant: any;
  sessionId: string;
  currentUserEmail: string | null;
  consumerEmail: string | null;
  setConsumerEmail: (email: string) => void;
  cart: any[];
  appliedCoupon: any;
  onHandleCartActions: (actions: any[], productsContext?: any[]) => Promise<void>;
  initialMessages?: ChatMessage[];
  welcomeMessage?: string;
}

function toUIMessage(message: ChatMessage): StorefrontUIMessage {
  return {
    id: message.id,
    role: message.sender === 'user' ? 'user' : 'assistant',
    parts: message.text
      ? [{ type: 'text', text: message.text, state: 'done' }]
      : [],
    metadata: message.metadata as StorefrontMessageMetadata | undefined,
  } as StorefrontUIMessage;
}

function toUIMessageList(messages: ChatMessage[]) {
  return deduplicateMessages(messages).map(toUIMessage);
}

function extractVisibleChatMessages(messages: StorefrontUIMessage[]) {
  return messages
    .map((message) => storefrontUIMessageToChatMessage(message))
    .filter((message): message is ChatMessage => message !== null);
}

function syncLayoutFromMetadata(prevLayout: any, incoming: any) {
  const nextLayout = incoming?.layout ? { ...(prevLayout || {}), ...incoming.layout } : { ...(prevLayout || {}) };
  const sections = [...((incoming?.layout?.sections || prevLayout?.sections || []).map((section: any) => ({ ...section })))];

  const upsertSection = (matcher: (section: any) => boolean, sectionPayload: any) => {
    const index = sections.findIndex(matcher);
    if (index >= 0) sections[index] = { ...sections[index], ...sectionPayload };
    else sections.push(sectionPayload);
  };

  if (incoming?.products?.length > 0) {
    upsertSection(
      (section) => section.id === 'stream-products' || section.type === 'product_grid',
      {
        id: 'stream-products',
        type: 'product_grid',
        title: 'You may also like',
        products: incoming.products,
      }
    );
  }

  if (incoming?.comparison) {
    upsertSection(
      (section) => section.id === 'comparison' || section.type === 'comparison',
      { id: 'comparison', type: 'comparison', comparison: incoming.comparison }
    );
  }

  if (incoming?.checkoutConfidence) {
    upsertSection(
      (section) => section.id === 'checkout-confidence' || section.type === 'checkout_confidence',
      { id: 'checkout-confidence', type: 'checkout_confidence', checkoutConfidence: incoming.checkoutConfidence }
    );
  }

  if (sections.length === 0) return prevLayout;
  return { ...nextLayout, sections };
}

export function useStorefrontChat({
  subdomain,
  merchant,
  sessionId,
  currentUserEmail,
  consumerEmail,
  setConsumerEmail,
  cart,
  appliedCoupon,
  onHandleCartActions,
  initialMessages = [],
  welcomeMessage = '',
}: UseStorefrontChatProps) {
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [aiLayout, setAiLayout] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const messagesLoadedRef = useRef(false);
  const messagesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isListening, setIsListening] = useState(false);

  const initialChatMessages = useMemo(() => {
    const storedMessages = typeof window !== 'undefined'
      ? localStorage.getItem(`chat_messages_${subdomain}`)
      : null;

    if (storedMessages) {
      try {
        const parsed = JSON.parse(storedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return toUIMessageList(parsed);
        }
      } catch {
        // fall through to props/defaults
      }
    }

    if (initialMessages.length > 0) {
      return toUIMessageList(deduplicateMessages(initialMessages));
    }

    return toUIMessageList([
      {
        id: 'welcome',
        sender: 'system',
        text: welcomeMessage,
      },
    ]);
  }, [initialMessages, subdomain, welcomeMessage]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/ai',
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        messages,
        subdomain,
        cart,
        sessionId,
        email: currentUserEmail || consumerEmail,
        appliedCoupon,
      },
    }),
  }), [appliedCoupon, cart, consumerEmail, currentUserEmail, sessionId, subdomain]);

  const chat = useChat<StorefrontUIMessage>({
    transport,
    messages: initialChatMessages,
    onError: () => {
      setAiUnavailable(true);
      setAiLayout(null);
    },
    onFinish: async ({ message: responseMessage }) => {
      const metadata = storefrontMessageMetadataSchema.safeParse(responseMessage.metadata).success
        ? responseMessage.metadata
        : null;

      if (metadata?.consumerEmail) {
        setConsumerEmail(metadata.consumerEmail);
      }

      if (metadata?.cartActions) {
        await onHandleCartActions(metadata.cartActions, metadata.products);
      }

      if (metadata) {
        setAiLayout((prev: any) => syncLayoutFromMetadata(prev, metadata));
      }

      const responseText = storefrontUIMessageToChatMessage(responseMessage as StorefrontUIMessage)?.text || '';
      if (responseText) {
        saveMessage('system', responseText);
      }

      setAiUnavailable(false);
    },
  });
  const { messages: chatMessages, sendMessage, setMessages, status } = chat;

  useEffect(() => {
    setIsTyping(status === 'submitted' || status === 'streaming');
  }, [status]);

  const saveMessage = useCallback(async (sender: string, text: string, convId?: string) => {
    const cId = convId || conversationIdRef.current;
    if (!cId) return;
    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          conversationId: cId,
          subdomain,
          sessionId,
          message: { sender, text },
        }),
      });
    } catch (error) {
      // save message failed — non-critical
    }
  }, [sessionId, subdomain]);

  const ensureConversation = useCallback(async () => {
    if (conversationIdRef.current) return conversationIdRef.current;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', subdomain, sessionId }),
      });
      const data = await res.json();
      if (data.conversation?.id) {
        conversationIdRef.current = data.conversation.id;
        setConversationId(data.conversation.id);
        if (merchant?.id) {
          localStorage.setItem(`convo_${merchant.id}`, data.conversation.id);
        }
        return data.conversation.id;
      }
    } catch (error) {
      // conversation creation failed — non-critical
    }
    return null;
  }, [merchant?.id, sessionId, subdomain]);

  useEffect(() => {
    if (messagesLoadedRef.current) return;
    messagesLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!messagesLoadedRef.current) return;
    if (messagesSaveTimer.current) clearTimeout(messagesSaveTimer.current);

    const visibleMessages = extractVisibleChatMessages(chatMessages as StorefrontUIMessage[]);
    if (visibleMessages.length === 0) {
      localStorage.removeItem(`chat_messages_${subdomain}`);
      return;
    }

    messagesSaveTimer.current = setTimeout(() => {
      localStorage.setItem(
        `chat_messages_${subdomain}`,
        JSON.stringify(sanitizeMessagesForStorage(deduplicateMessages(visibleMessages)))
      );
    }, 500);

    return () => {
      if (messagesSaveTimer.current) clearTimeout(messagesSaveTimer.current);
    };
  }, [chatMessages, subdomain]);

  const clearChat = useCallback(() => {
    const resetMessages = toUIMessageList([
      {
        id: 'welcome',
        sender: 'system',
        text: welcomeMessage,
      },
    ]);
    setMessages(resetMessages);
    setAiLayout(null);
    setAiUnavailable(false);
    setConversationId(null);
    conversationIdRef.current = null;
    if (merchant?.id) localStorage.removeItem(`convo_${merchant.id}`);
  }, [merchant?.id, setMessages, welcomeMessage]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || inputText.trim();
    if (!textToSend) return;

    setInputText('');

    const convId = await ensureConversation();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: 'user',
      text: textToSend,
    };

    await saveMessage('user', textToSend, convId || undefined);
    setAiUnavailable(false);
    sendMessage({ text: userMsg.text });
  }, [ensureConversation, inputText, saveMessage, sendMessage]);

  const toggleListening = useCallback((recognitionRef: React.MutableRefObject<any>) => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      toast.error('Voice recognition failed.');
    }
  }, [isListening]);

  const messages = useMemo(() => extractVisibleChatMessages(chatMessages as StorefrontUIMessage[]), [chatMessages]);

  return {
    messages,
    uiMessages: chatMessages as StorefrontUIMessage[],
    setMessages: chat.setMessages,
    inputText,
    setInputText,
    isTyping,
    setIsTyping,
    isListening,
    toggleListening,
    aiUnavailable,
    setAiUnavailable,
    aiLayout,
    setAiLayout,
    conversationId,
    handleSendMessage,
    clearChat,
    ensureConversation,
    saveMessage,
  };
}
