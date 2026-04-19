import { ReactNode } from 'react';

export interface Banner {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  button_text?: string;
  button_link?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
  category_id?: string;
  badge?: string;
  created_at?: string;
  bargainedPrice?: number;
  originalPrice?: number;
  [key: string]: any;
}

export interface CartItem {
  id: string;
  quantity: number;
  product: Product;
  bargainedPrice?: number;
  originalPrice?: number;
}

export interface Merchant {
  id: string;
  name: string;
  currency?: string;
  locale?: string;
  google_search_console_id?: string;
  bing_verification_id?: string;
  branding_settings?: {
    banners?: Banner[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  [key: string]: any;
}

export interface BundleSection {
  id: string;
  type: 'product_bundle';
  title: string;
  description: string;
  products: Product[];
  discountPercentage?: number;
}

export interface ProductGridSection {
  id: string;
  type: 'product_grid';
  title?: string;
  products?: Product[];
  productIds?: string[];
  category?: string;
  categoryId?: string;
}

export interface HeroSection {
  id: string;
  type: 'hero';
  banners?: Banner[];
  banner_url?: string;
  title?: string;
  subtitle?: string;
}

export interface CategoryStripSection {
  id: string;
  type: 'category_strip';
  title?: string;
}

export interface AllProductsSection {
  id: string;
  type: 'all_products';
  title?: string;
}

export interface PromoCodesSection {
  id: string;
  type: 'promo_codes';
}

export interface TrustCue {
  icon: ReactNode;
  label: string;
  desc: string;
}

export interface SectionProps<TSection = unknown> {
  section: TSection;
  merchant: Merchant;
  onSelectProduct: (product: Product) => void;
  addToCart: (product: Product) => void;
  cart: CartItem[];
  onUpdateQuantity?: (id: string, qty: number) => void;
}
