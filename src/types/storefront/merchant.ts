import type { Merchant, BrandingSettings } from '@/types';

export type StorefrontMerchant = Pick<Merchant, 
  | 'id' 
  | 'user_id' 
  | 'store_name' 
  | 'subdomain' 
  | 'currency' 
  | 'locale' 
  | 'branding_settings' 
  | 'ai_provider' 
  | 'ai_character_name' 
  | 'ai_character_avatar_url' 
  | 'payment_methods' 
  | 'shipping_settings' 
  | 'tax_settings'
>;

export type { BrandingSettings };
