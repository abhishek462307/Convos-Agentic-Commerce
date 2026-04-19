import type { ChatMessage, Product } from '@/types';

export interface ChatMetadata {
  products?: Product[];
  suggestionButtons?: (string | { label: string; action: string })[];
  showCartButtons?: boolean;
  requiresIdentification?: boolean;
}

export interface AISection {
  id: string;
  type: string;
  title?: string;
  content: any;
}

export interface AILayout {
  sections: AISection[];
}

export interface ConversationState {
  conversationId: string | null;
  interactionStage: 'landing' | 'active';
  viewMode: 'store' | 'chat';
}
