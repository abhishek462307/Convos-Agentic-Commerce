export type SectionType =
  | 'hero'
  | 'product_bundle'
  | 'product_grid'
  | 'promo_codes'
  | 'trust_cues'
  | 'category_strip'
  | 'categories'
  | 'popular_products'
  | 'best_sellers'
  | 'all_products'
  | 'welcome_text'
  | 'newsletter';

export interface SectionSchema {
  id: string;
  type: SectionType;
  enabled?: boolean;
  title?: string;
  content?: Record<string, unknown>;
}
