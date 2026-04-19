import type { Merchant } from '@/types';

export type MerchantPolicySource = Partial<Pick<
  Merchant,
  'ai_refund_policy' | 'ai_shipping_policy' | 'ai_loyalty_policy' | 'ai_max_discount_percentage'
>> & {
  ai_max_refund_amount?: number | string | null
}

export type ApprovalPolicyDomain =
  | 'refunds'
  | 'loyalty'
  | 'pricing'
  | 'shipping'
  | 'campaigns'
  | 'catalog'
  | 'support'
  | 'orders'
  | 'mission'
  | 'update'

export interface ApprovalPolicyDecision {
  domain: ApprovalPolicyDomain
  allowed: boolean
  requiresApproval: boolean
  summary: string
}

export interface MerchantPolicySnapshot {
  autonomyMode: 'high'
  refundsAllowed: boolean
  loyaltyAllowed: boolean
  shippingAutonomyAllowed: boolean
  canAutoLaunchCampaigns: boolean
  canAutoAdjustCatalog: boolean
  canAutoSupportCustomers: boolean
  canAutoOperateOrders: boolean
  maxDiscountPercentage: number
  maxRefundAmount: number
  customerContactRateLimit: number
  outboundCampaignRequiresApproval: boolean
  pricingRequiresApprovalAbovePercent: number
}

export function resolveMerchantPolicies(merchant: MerchantPolicySource): MerchantPolicySnapshot {
  const refundPolicy = merchant.ai_refund_policy || 'approval_required';
  const shippingPolicy = merchant.ai_shipping_policy || 'approval_required';
  const loyaltyPolicy = merchant.ai_loyalty_policy || 'approval_required';
  const maxDiscountPercentage = Number(merchant.ai_max_discount_percentage || 0);
  const maxRefundAmount = Number((merchant as any).ai_max_refund_amount || 0);

  return {
    autonomyMode: 'high',
    refundsAllowed: refundPolicy !== 'disabled',
    loyaltyAllowed: loyaltyPolicy !== 'disabled',
    shippingAutonomyAllowed: shippingPolicy !== 'disabled',
    canAutoLaunchCampaigns: true,
    canAutoAdjustCatalog: true,
    canAutoSupportCustomers: true,
    canAutoOperateOrders: shippingPolicy === 'autonomous',
    maxDiscountPercentage,
    maxRefundAmount,
    customerContactRateLimit: 3,
    outboundCampaignRequiresApproval: false,
    pricingRequiresApprovalAbovePercent: maxDiscountPercentage,
  };
}

export function policyRequiresApproval(
  policies: MerchantPolicySnapshot,
  domain: 'refunds' | 'campaigns' | 'catalog' | 'support' | 'orders',
  risk?: { discountPercentage?: number; amount?: number; outboundContacts?: number }
) {
  if (domain === 'refunds') {
    return true;
  }

  if (domain === 'campaigns') {
    return policies.outboundCampaignRequiresApproval || (risk?.outboundContacts || 0) > policies.customerContactRateLimit;
  }

  if (domain === 'catalog') {
    return (risk?.discountPercentage || 0) > policies.pricingRequiresApprovalAbovePercent;
  }

  if (domain === 'orders') {
    return !policies.canAutoOperateOrders;
  }

  return false;
}

export function evaluateApprovalPolicy(
  merchant: MerchantPolicySource,
  domain: ApprovalPolicyDomain,
  risk?: { discountPercentage?: number; amount?: number; outboundContacts?: number }
): ApprovalPolicyDecision {
  const policies = resolveMerchantPolicies(merchant);

  if (domain === 'refunds') {
    return {
      domain,
      allowed: policies.refundsAllowed,
      requiresApproval: true,
      summary: policies.refundsAllowed
        ? `Refund approvals stay manual${policies.maxRefundAmount > 0 ? ` up to ${policies.maxRefundAmount}` : ''}.`
        : 'Refund approvals are disabled by merchant policy.',
    };
  }

  if (domain === 'loyalty') {
    const loyaltyPolicy = merchant.ai_loyalty_policy || 'approval_required';
    return {
      domain,
      allowed: policies.loyaltyAllowed,
      requiresApproval: loyaltyPolicy !== 'autonomous',
      summary: policies.loyaltyAllowed
        ? loyaltyPolicy === 'autonomous'
          ? 'Loyalty rewards may auto-run within merchant policy.'
          : 'Loyalty rewards require explicit approval.'
        : 'Loyalty rewards are disabled by merchant policy.',
    };
  }

  if (domain === 'pricing' || domain === 'catalog') {
    const discountPercentage = Number(risk?.discountPercentage || 0);
    const requiresApproval = policyRequiresApproval(policies, 'catalog', { discountPercentage });
    return {
      domain,
      allowed: true,
      requiresApproval,
      summary: requiresApproval
        ? `Pricing changes above ${policies.pricingRequiresApprovalAbovePercent}% require approval.`
        : 'Pricing change is within merchant autonomy bounds.',
    };
  }

  if (domain === 'shipping' || domain === 'orders') {
    const requiresApproval = policyRequiresApproval(policies, 'orders', risk);
    return {
      domain,
      allowed: policies.shippingAutonomyAllowed,
      requiresApproval,
      summary: policies.shippingAutonomyAllowed
        ? requiresApproval
          ? 'Order or shipping changes require approval under current autonomy settings.'
          : 'Order and shipping changes can run autonomously.'
        : 'Order or shipping automation is disabled by merchant policy.',
    };
  }

  if (domain === 'campaigns') {
    const requiresApproval = policyRequiresApproval(policies, 'campaigns', risk);
    return {
      domain,
      allowed: policies.canAutoLaunchCampaigns,
      requiresApproval,
      summary: requiresApproval
        ? 'Outbound campaign volume exceeds automatic send policy.'
        : 'Campaign action is within merchant contact policy.',
    };
  }

  if (domain === 'support') {
    return {
      domain,
      allowed: policies.canAutoSupportCustomers,
      requiresApproval: !policies.canAutoSupportCustomers,
      summary: policies.canAutoSupportCustomers
        ? 'Support automation is allowed for this merchant.'
        : 'Support automation is disabled by merchant policy.',
    };
  }

  if (domain === 'mission') {
    return {
      domain,
      allowed: true,
      requiresApproval: true,
      summary: 'Mission plans require merchant approval before execution when flagged.',
    };
  }

  return {
    domain,
    allowed: true,
    requiresApproval: true,
    summary: 'This action requires explicit approval.',
  };
}
