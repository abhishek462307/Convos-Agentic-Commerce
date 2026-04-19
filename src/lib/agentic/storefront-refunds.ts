interface StorefrontRefundPolicyInput {
  merchantRefundPolicy?: string | null
  trustScore?: number | null
  refundMaxAmount?: number | null
  orderAmount?: number | null
}

export function shouldStorefrontAgentAutoRefund(input: StorefrontRefundPolicyInput) {
  void input;
  return false;
}
