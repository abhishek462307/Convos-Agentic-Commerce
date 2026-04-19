
export interface ConvosStateType {
  messages: any[];
  merchant: any;
  sessionId: string;
  subdomain: string;
  cart: any[];
  consumerEmail?: string;
  consumerProfile: any;
  activeBargains: any[];
  storeBargainEnabled: boolean;
  products: any[];
  cartActions: any[];
  layoutResult: any;
  couponResult: any;
  bargainResult: any;
  suggestionButtons: Array<string | { label: string; action: string }>;
  activePreferences: any[];
  refinementOptions: Array<{ label: string; action: string; type?: string }>;
  isComplexGoal?: boolean;
  comparisonResult?: any;
  checkoutConfidence?: any;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
