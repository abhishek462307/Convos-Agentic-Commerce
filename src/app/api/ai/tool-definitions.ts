interface ToolSelectionContext {
  message?: string;
  history?: Array<{ sender?: string; text?: string }>;
  cart?: any[];
}

const BASE_TOOL_NAMES = [
  'search_products',
  'get_popular_products',
  'get_product_details',
  'compare_products',
  'get_checkout_confidence',
  'update_web_layout',
  'show_suggestion_buttons',
  'add_to_cart',
  'get_recommendations',
  'suggest_bundle',
] as const;

const CART_KEYWORDS = [
  'cart', 'bag', 'basket', 'add to cart', 'remove', 'delete', 'quantity', 'qty',
  'coupon', 'promo', 'discount code', 'apply code', 'checkout'
];

const CHECKOUT_KEYWORDS = [
  'checkout', 'check out', 'buy now', 'place order', 'pay', 'payment',
  'purchase', 'ship to', 'shipping address', 'delivery address'
];

const BARGAIN_KEYWORDS = [
  'bargain', 'negotiat', 'deal', 'better price', 'lower price', 'discount',
  'cheaper', 'offer', 'price match'
];

const POST_PURCHASE_KEYWORDS = [
  'order status', 'track order', 'where is my order', 'refund', 'return',
  'replace', 'cancel order'
];

const AUTH_KEYWORDS = [
  'login', 'log in', 'sign in', 'authenticate', 'magic link', 'verify'
];

const MISSION_KEYWORDS = [
  'price watch', 'notify me', 'alert me', 'wishlist', 'wish list',
  'remind me', 'track this', 'mission', 'goal'
];

const COMPARISON_KEYWORDS = [
  'compare', 'comparison', 'vs', 'versus', 'difference', 'which is better', 'best option'
];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildPrunedToolNames(args: {
  storeBargainEnabled: boolean;
  hasConsumerEmail: boolean;
  message?: string;
  history?: Array<{ sender?: string; text?: string }>;
  cart?: any[];
}): Set<string> {
  const recentHistory = (args.history || [])
    .slice(-4)
    .map((h) => (typeof h?.text === 'string' ? h.text : ''))
    .join(' ');
  const combinedText = `${recentHistory} ${args.message || ''}`.toLowerCase();
  const hasCartItems = (args.cart?.length || 0) > 0;

  const wantsCartOps = hasCartItems || includesAny(combinedText, CART_KEYWORDS);
  const wantsCheckout = includesAny(combinedText, CHECKOUT_KEYWORDS);
  const wantsBargain = args.storeBargainEnabled && includesAny(combinedText, BARGAIN_KEYWORDS);
  const wantsPostPurchase = args.hasConsumerEmail && includesAny(combinedText, POST_PURCHASE_KEYWORDS);
  const wantsAuth = includesAny(combinedText, AUTH_KEYWORDS);
  const wantsMissionOps = args.hasConsumerEmail && includesAny(combinedText, MISSION_KEYWORDS);
  const wantsPaymentLink = args.hasConsumerEmail && (
    combinedText.includes('payment link') ||
    combinedText.includes('checkout link') ||
    combinedText.includes('pay link')
  );
  const wantsLoyalty = args.hasConsumerEmail && (
    combinedText.includes('loyalty') ||
    combinedText.includes('reward') ||
    combinedText.includes('vip')
  );
  const wantsComparison = includesAny(combinedText, COMPARISON_KEYWORDS);

  const selected = new Set<string>(BASE_TOOL_NAMES);

  if (wantsCartOps) {
    selected.add('remove_from_cart');
    selected.add('apply_coupon');
  }

  if (wantsComparison) {
    selected.add('compare_products');
  }

  if (wantsCheckout || wantsAuth) {
    selected.add('check_auth_status');
    selected.add('send_login_link');
    selected.add('trigger_auth');
    selected.add('start_checkout');
    selected.add('get_checkout_confidence');
  }

  if (wantsPaymentLink || (wantsCheckout && hasCartItems && args.hasConsumerEmail)) {
    selected.add('generate_direct_payment_link');
  }

  if (wantsBargain) {
    selected.add('get_bargain_products');
    selected.add('set_bargained_price');
    if (args.hasConsumerEmail) selected.add('log_negotiation');
  }

  if (args.hasConsumerEmail) {
    selected.add('log_consumer_event');
    selected.add('upsert_customer_intent');
    selected.add('create_agent_plan');
  }

  if (wantsMissionOps) {
    selected.add('update_agent_memory');
    selected.add('get_agent_permissions');
  }

  if (wantsPostPurchase) {
    selected.add('get_order_status');
    selected.add('request_refund_or_return');
    selected.add('create_support_request');
  }

  if (wantsLoyalty) {
    selected.add('apply_loyalty_reward');
  }

  return selected;
}

export function getToolDefinitions(
  storeBargainEnabled: boolean,
  hasConsumerEmail: boolean = false,
  selectionContext?: ToolSelectionContext
): any[] {
  const allTools = [
    {
      type: 'function',
      function: {
        name: 'suggest_bundle',
        description: 'Suggest a smart bundle of products that go well together. This will display a specialized bundle UI to the customer.',
        parameters: {
          type: 'object',
          properties: {
            bundleName: { type: 'string', description: 'Name of the bundle (e.g., "The Morning Starter Pack")' },
            description: { type: 'string', description: 'Why these products go well together' },
            productIds: { type: 'array', items: { type: 'string' }, description: 'List of product IDs in the bundle' },
            discountPercentage: { type: 'number', description: 'Optional discount for the bundle (e.g., 10 for 10% off)' }
          },
          required: ['bundleName', 'description', 'productIds']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'search_products',
        description: 'Search for products by name, category, description, and budget filters. Use this to understand which products actually match the user, then reason from the returned product data.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search keywords' },
            category: { type: 'string', description: 'Filter by category name' },
            minPrice: { type: 'number', description: 'Minimum price filter' },
            maxPrice: { type: 'number', description: 'Maximum price filter' },
            inStockOnly: { type: 'boolean', description: 'Only show in-stock items' },
            size: { type: 'string', description: 'Optional size or dimension preference' },
            color: { type: 'string', description: 'Optional color preference' },
            urgency: { type: 'string', description: 'Optional delivery urgency like today, this week, urgent' },
            dealsOnly: { type: 'boolean', description: 'Only show sale or discounted items' },
            bargainOnly: { type: 'boolean', description: 'Only show products with bargaining enabled' }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_popular_products',
        description: 'Get popular/featured products for the store. Use this when the user first visits, asks "what do you have?", or you want to proactively showcase products. Returns a curated selection.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Optional category to filter by' },
            limit: { type: 'number', description: 'Number of products to return (default 8, max 20)' }
          }
        }
      }
    },
    ...(storeBargainEnabled ? [{
      type: 'function',
      function: {
        name: 'get_bargain_products',
        description: 'Get all products that have bargaining/negotiation enabled, including their minimum acceptable prices. Use this before starting any price negotiation.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Optional: get bargain info for a specific product only' }
          }
        }
      }
    }] : []),
    {
      type: 'function',
      function: {
        name: 'get_product_details',
        description: 'Get the deepest available details for a specific product, including active variants when available. Use this for comparisons, follow-up questions, and variant selection.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'The product ID' }
          },
          required: ['productId']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'compare_products',
        description: 'Compare 2 or 3 specific products using normalized shopping signals like price, stock, variants, reviews, and fit.',
        parameters: {
          type: 'object',
          properties: {
            productIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              maxItems: 3,
              description: 'Two or three product IDs to compare'
            }
          },
          required: ['productIds']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_checkout_confidence',
        description: 'Estimate subtotal, shipping, tax, payment methods, and returns posture before checkout.',
        parameters: {
          type: 'object',
          properties: {
            customerInfo: {
              type: 'object',
              properties: {
                country: { type: 'string' },
                state: { type: 'string' },
                pincode: { type: 'string' },
                email: { type: 'string' }
              }
            },
            couponCode: { type: 'string', description: 'Optional coupon code to estimate impact' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'add_to_cart',
        description: 'Add a product to cart. If the product has variants, pass the exact variantId the customer chose.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID to add' },
            variantId: { type: 'string', description: 'Optional variant ID for size/color/config selections' },
            quantity: { type: 'number', description: 'Quantity (default 1)' }
          },
          required: ['productId']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'remove_from_cart',
        description: 'Remove a product from cart. Pass variantId when removing a specific size/color/config.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID to remove' },
            variantId: { type: 'string', description: 'Optional variant ID for removing a specific variant row' },
            variantName: { type: 'string', description: 'Optional variant name if only the human-readable option is available' }
          },
          required: ['productId']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'apply_coupon',
        description: 'Apply a discount/coupon code to the order. NOTE: Cannot be used if cart has bargained prices.',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'The code to apply' }
          },
          required: ['code']
        }
      }
    },
    ...(storeBargainEnabled ? [{
      type: 'function',
      function: {
        name: 'set_bargained_price',
        description: 'Set a negotiated/bargained price for a product. Only use for products with bargain mode enabled. The price must be between the min_price and original price.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID to set bargained price for' },
            bargainedPrice: { type: 'number', description: 'The agreed upon bargained price' }
          },
          required: ['productId', 'bargainedPrice']
        }
      }
    }] : []),
    ...(hasConsumerEmail ? [
    {
      type: 'function',
      function: {
        name: 'check_previous_purchases',
        description: 'Check if a customer has made previous purchases and get their trust profile using their email.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'The customer email address' }
          },
          required: ['email']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'update_agent_memory',
        description: 'Store a specific preference or fact about the customer in your long-term memory.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'The customer email address' },
            key: { type: 'string', description: 'The type of memory (e.g., "coffee_preference", "budget_range")' },
            value: { type: 'string', description: 'The value to remember' }
          },
          required: ['email', 'key', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
          name: 'upsert_customer_intent',
          description: 'Create or update a long-term goal for the customer.',
          parameters: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'The customer email address' },
              intent_type: { type: 'string', description: 'Type of intent (e.g., "purchase", "wishlist", "price_watch", "restock")' },
              goal: { type: 'string', description: 'The specific goal' },
              constraints: { type: 'object', description: 'Any constraints like max_price, color, etc.' },
              suggested_by_ai: { type: 'boolean', description: 'True if the AI proactively suggested this mission' }
            },
            required: ['email', 'intent_type', 'goal']
          }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_agent_plan',
        description: 'Create a step-by-step plan for an agent to fulfill a customer intent.',
        parameters: {
          type: 'object',
          properties: {
            intentId: { type: 'string', description: 'The ID of the customer intent' },
            steps: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of steps to take'
            }
          },
          required: ['intentId', 'steps']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'log_negotiation',
        description: 'Log a round of negotiation between a buyer and the merchant.',
        parameters: {
          type: 'object',
          properties: {
            intentId: { type: 'string', description: 'The ID of the customer intent being negotiated' },
            buyerOffer: { type: 'number', description: 'The current offer from the buyer' },
            merchantOffer: { type: 'number', description: 'The current counter-offer from the merchant' },
            round: { type: 'number', description: 'The round number' },
            outcome: { type: 'string', description: 'Current status: "pending", "accepted", "rejected"' }
          },
          required: ['intentId', 'buyerOffer', 'merchantOffer']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_agent_permissions',
        description: 'Check the autonomy level and spend limits for the customer agent.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'The customer email address' }
          },
          required: ['email']
        }
      }
    },
    ] : []),
    {
      type: 'function',
      function: {
        name: 'update_web_layout',
        description: 'Construct or update the web storefront layout dynamically. Use this when you find relevant products, categories, or want to showcase a hero banner or promo.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Main title for the dynamic layout' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['hero', 'product_bundle', 'product_grid', 'promo_codes', 'category_strip', 'all_products', 'mission_status', 'comparison', 'checkout_confidence'] },
                  title: { type: 'string' },
                  subtitle: { type: 'string' },
                  banner_url: { type: 'string' },
                  mission_title: { type: 'string' },
                  mission_progress: { type: 'number', description: '0 to 100' },
                  mission_status_text: { type: 'string' },
                  banners: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        image_url: { type: 'string' },
                        title: { type: 'string' },
                        subtitle: { type: 'string' }
                      }
                    }
                  },
                  products: { type: 'array', items: { type: 'object' } },
                  productIds: { type: 'array', items: { type: 'string' } },
                  categoryId: { type: 'string' },
                  category: { type: 'string' },
                  code: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['type']
              }
            }
          },
          required: ['sections']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'trigger_auth',
        description: 'Prompt the user to login or sign up. Use this when the user wants to purchase or checkout but is not identified.',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Why auth is needed (e.g., "to complete your purchase")' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'start_checkout',
        description: 'Initiate the checkout process. You can pre-fill customer details if you have collected them in chat. Collect address info early to improve the experience.',
        parameters: {
          type: 'object',
          properties: {
            customerInfo: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                pincode: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' }
              }
            },
            paymentMethod: { type: 'string', enum: ['cod', 'stripe', 'razorpay'], description: 'Preferred payment method if mentioned' }
          }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'show_suggestion_buttons',
        description: 'Display a list of suggestion buttons to the user for quick selection. Use this whenever you ask a question with multiple choices.',
        parameters: {
          type: 'object',
          properties: {
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'The labels for the buttons (e.g., ["Dark Roast", "Light Roast", "Medium Roast"])'
            }
          },
          required: ['options']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_recommendations',
        description: 'Get product recommendations.',
        parameters: {
          type: 'object',
          properties: {
            basedOn: { type: 'string', description: 'Category or "cart"' }
          },
          required: ['basedOn']
        }
      }
    },
    ...(hasConsumerEmail ? [{
      type: 'function',
      function: {
        name: 'log_consumer_event',
        description: 'Log a significant behavioral event about the consumer for store intelligence.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'The customer email address' },
            eventType: { type: 'string', description: 'Type of event (e.g., "style_preference", "address_update", "interest_discovered")' },
            eventData: { type: 'object', description: 'Details about the behavior or information' }
          },
          required: ['email', 'eventType', 'eventData']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_order_status',
        description: 'Fetch the real-time status and tracking information for a customer\'s orders.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'The customer email address' },
            orderId: { type: 'string', description: 'Optional specific order ID' }
          },
          required: ['email']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'request_refund_or_return',
        description: 'Handle a refund or return request for a specific order. Use this when the customer explicitly wants a refund, return, or cancellation for an existing order.',
        parameters: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'The ID of the order' },
            reason: { type: 'string', description: 'Reason for refund/return' },
            requestedItems: { type: 'array', items: { type: 'string' }, description: 'Specific product IDs to return' }
          },
          required: ['orderId', 'reason']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'create_support_request',
        description: 'Create a support request for order issues, delivery problems, damaged items, account help, or any other customer support need.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'The customer email address' },
            topic: { type: 'string', description: 'Short support topic like "delivery delay" or "damaged item"' },
            details: { type: 'string', description: 'The customer problem in plain language' },
            orderId: { type: 'string', description: 'Optional related order ID' }
          },
          required: ['email', 'topic', 'details']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'apply_loyalty_reward',
        description: 'Grant a special loyalty discount or gift to a customer based on their Trust Score.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'The customer email address' },
            rewardType: { type: 'string', enum: ['discount', 'free_shipping', 'surprise_gift'], description: 'Type of reward to grant' }
          },
          required: ['email', 'rewardType']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'generate_direct_payment_link',
        description: 'Generate a direct Stripe payment link for the current cart.',
        parameters: {
          type: 'object',
          properties: {
            customerInfo: {
              type: 'object',
              description: 'Customer details',
              properties: {
                name: { type: 'string' },
                email: { type: 'string', description: 'Customer email (required)' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                pincode: { type: 'string' },
                country: { type: 'string' }
              },
              required: ['email']
            }
          },
          required: ['customerInfo']
        }
      }
    }] : []),
    {
      type: 'function',
      function: {
        name: 'check_auth_status',
        description: 'Check if the current user is authenticated and get their basic profile.',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'send_login_link',
        description: 'Send a magic login link to the user\'s email for secure authentication.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'The user\'s email address' }
          },
          required: ['email']
        }
      }
    }
  ];

  if (!selectionContext) {
    return allTools;
  }

  const selectedToolNames = buildPrunedToolNames({
    storeBargainEnabled,
    hasConsumerEmail,
    message: selectionContext.message,
    history: selectionContext.history,
    cart: selectionContext.cart,
  });

  const filteredTools = allTools.filter((tool) => selectedToolNames.has(tool.function.name));

  // Safety fallback: never return an empty tool list.
  return filteredTools.length > 0 ? filteredTools : allTools;
}
