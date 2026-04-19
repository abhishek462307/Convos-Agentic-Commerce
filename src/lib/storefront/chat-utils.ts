import type { ChatMessage } from '@/types';

export function sanitizeMessagesForStorage(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => {
    if (!message.metadata) return message;

    const sanitizedProducts: typeof message.metadata.products = message.metadata.products?.map((product) => ({
      id: product.id,
      merchant_id: product.merchant_id,
      name: product.name,
      description: product.description,
      price: product.price,
      compare_at_price: product.compare_at_price,
      stock_quantity: product.stock_quantity,
      category: product.category,
      category_id: product.category_id,
      image_url: product.image_url,
      badge: product.badge,
      is_veg: product.is_veg,
      original_price: product.original_price,
      ai_reason: product.ai_reason,
      ai_tradeoff: product.ai_tradeoff,
      ai_highlights: product.ai_highlights,
      variants: product.variants,
    }));

    return {
      ...message,
      metadata: {
        ...message.metadata,
        ...(sanitizedProducts ? { products: sanitizedProducts } : {}),
      },
    };
  });
}

export function deduplicateMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set();
  return messages.filter((msg) => {
    const key = `${msg.id}-${msg.sender}-${msg.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
