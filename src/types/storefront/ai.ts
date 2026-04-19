import type { UIMessage, UIMessagePart } from 'ai';
import { z } from 'zod';

import type {
  ActiveFilter,
  ChatMessage,
  CheckoutConfidence,
  PreferenceSummary,
  Product,
  ProductComparison,
  RecoveryState,
  RefinementOption,
  VariantPrompt,
} from '@/types';

const suggestionButtonSchema = z.union([
  z.string(),
  z.object({
    label: z.string(),
    action: z.string().optional(),
  }).passthrough(),
]);

export const storefrontMessageMetadataSchema = z.object({
  products: z.array(z.any()).optional(),
  suggestionButtons: z.array(suggestionButtonSchema).optional(),
  showCartButtons: z.boolean().optional(),
  requiresIdentification: z.boolean().optional(),
  checkoutConfidence: z.any().optional(),
  comparison: z.any().optional(),
  activePreferences: z.array(z.any()).optional(),
  refinementOptions: z.array(z.any()).optional(),
  activeFilters: z.array(z.any()).optional(),
  variantPrompt: z.any().optional(),
  recoveryState: z.any().optional(),
  lastStableResultId: z.string().optional(),
  cartActions: z.array(z.any()).optional(),
  layout: z.any().optional(),
  intents: z.array(z.any()).optional(),
  plans: z.array(z.any()).optional(),
  coupon: z.any().optional(),
  bargain: z.any().optional(),
  consumerEmail: z.string().nullable().optional(),
  error: z.string().optional(),
}).passthrough();

export type StorefrontMessageMetadata = z.infer<typeof storefrontMessageMetadataSchema>;
export type StorefrontUIMessage = UIMessage<StorefrontMessageMetadata>;

function normalizeMessageParts(parts: unknown): NonNullable<StorefrontUIMessage['parts']> {
  if (!Array.isArray(parts)) return [];

  const normalizedParts: UIMessagePart<any, any>[] = [];

  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;

    if ((part as Record<string, unknown>).type === 'text') {
      normalizedParts.push({
        ...(part as Record<string, unknown>),
        type: 'text',
        text: typeof (part as Record<string, unknown>).text === 'string' ? (part as Record<string, unknown>).text as string : '',
        state: ((part as Record<string, unknown>).state as string | undefined) || 'done',
      } as UIMessagePart<any, any>);
      continue;
    }

    if ((part as Record<string, unknown>).type === 'reasoning') {
      normalizedParts.push({
        ...(part as Record<string, unknown>),
        type: 'reasoning',
        text: typeof (part as Record<string, unknown>).text === 'string' ? (part as Record<string, unknown>).text as string : '',
        state: ((part as Record<string, unknown>).state as string | undefined) || 'done',
      } as UIMessagePart<any, any>);
    }
  }

  return normalizedParts as NonNullable<StorefrontUIMessage['parts']>;
}

function readTextParts(message: Pick<StorefrontUIMessage, 'parts'>) {
  return normalizeMessageParts(message.parts)
    .map((part) => {
      if (part.type === 'text') return part.text;
      if (part.type === 'reasoning') return part.text;
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function storefrontUIMessageToChatMessage(message: StorefrontUIMessage): ChatMessage | null {
  if (message.role === 'assistant' || message.role === 'system') {
    const text = readTextParts(message);
    const metadata = message.metadata && storefrontMessageMetadataSchema.safeParse(message.metadata).success
      ? (message.metadata as ChatMessage['metadata'] & StorefrontMessageMetadata)
      : undefined;

    if (!text && !metadata) return null;

    return {
      id: message.id,
      sender: 'system',
      text,
      metadata: metadata ? {
        products: metadata.products as Product[] | undefined,
        suggestionButtons: metadata.suggestionButtons,
        showCartButtons: metadata.showCartButtons,
        requiresIdentification: metadata.requiresIdentification,
        checkoutConfidence: metadata.checkoutConfidence as CheckoutConfidence | undefined,
        comparison: metadata.comparison as ProductComparison | undefined,
        activePreferences: metadata.activePreferences as PreferenceSummary[] | undefined,
        refinementOptions: metadata.refinementOptions as RefinementOption[] | undefined,
        activeFilters: metadata.activeFilters as ActiveFilter[] | undefined,
        variantPrompt: metadata.variantPrompt as VariantPrompt | undefined,
        recoveryState: metadata.recoveryState as RecoveryState | undefined,
        lastStableResultId: metadata.lastStableResultId,
      } : undefined,
    };
  }

  if (message.role === 'user') {
    const text = readTextParts(message);
    return {
      id: message.id,
      sender: 'user',
      text,
    };
  }

  return null;
}

export function storefrontUIMessagesToChatMessages(messages: StorefrontUIMessage[]): ChatMessage[] {
  return messages
    .map((message) => storefrontUIMessageToChatMessage({
      ...message,
      parts: normalizeMessageParts(message.parts),
    } as StorefrontUIMessage))
    .filter((message): message is ChatMessage => message !== null);
}
