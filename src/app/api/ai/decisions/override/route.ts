import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { applyDecisionApprovalAction } from '@/lib/domain/decision-approvals';

export async function POST(req: Request) {
  try {
    const { decisionLogId, merchantId, action, reason } = await req.json();

    if (!decisionLogId || !merchantId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await applyDecisionApprovalAction({
      merchantId,
      decisionLogId,
      action,
      reason: reason || null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Override error:', error);

    if (typeof error?.message === 'string' && error.message) {
      if (
        error.message === 'Decision not found' ||
        error.message === 'Refunds are disabled for this store' ||
        error.message === 'Loyalty rewards are disabled for this store' ||
        error.message === 'Approved price is out of allowed range' ||
        error.message === 'Approved price must be greater than 0 and less than the original price' ||
        error.message === 'Shipping selection is disabled for this store' ||
        error.message === 'Stripe is not enabled for this store' ||
        error.message.includes('secret key is missing') ||
        error.message.includes('out of stock') ||
        error.message.includes('unavailable')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
