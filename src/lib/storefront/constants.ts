import { 
  Truck, 
  Shield, 
  RotateCcw, 
  Lock, 
  Clock, 
  Zap, 
  CheckCircle, 
  Award, 
  Heart,
  Package,
  Percent,
  Sparkles
} from 'lucide-react';
import React from 'react';

export const ICON_MAP: Record<string, React.ReactNode> = {
  'truck': React.createElement(Truck, { className: "w-5 h-5" }),
  'shield': React.createElement(Shield, { className: "w-5 h-5" }),
  'rotate-ccw': React.createElement(RotateCcw, { className: "w-5 h-5" }),
  'lock': React.createElement(Lock, { className: "w-5 h-5" }),
  'clock': React.createElement(Clock, { className: "w-5 h-5" }),
  'zap': React.createElement(Zap, { className: "w-5 h-5" }),
  'check-circle': React.createElement(CheckCircle, { className: "w-5 h-5" }),
  'award': React.createElement(Award, { className: "w-5 h-5" }),
  'heart': React.createElement(Heart, { className: "w-5 h-5" }),
};

export const STOREFRONT_MERCHANT_SELECT = 'id,user_id,store_name,subdomain,currency,locale,branding_settings,ai_provider,ai_character_name,ai_character_avatar_url,payment_methods,shipping_settings,tax_settings' as const;

export const STOREFRONT_CATEGORY_SELECT = 'id,merchant_id,name,image_url,created_at' as const;

export const STOREFRONT_DISCOUNT_SELECT = 'id,merchant_id,code,type,value,min_order_amount,starts_at,ends_at,usage_limit,used_count,created_at' as const;

export const QUICK_ACTIONS = [
  { label: "show me everything", icon: Package },
  { label: "what's popular?", icon: Sparkles },
  { label: "any deals today?", icon: Percent },
];

export const INITIAL_ROWS = 40;
export const ROW_BATCH = 20;
