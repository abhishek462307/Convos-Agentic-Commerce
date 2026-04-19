import { createSupportCase } from '@/lib/domain/support';
import logger from '@/lib/logger';
import { sendInternalEmail } from '@/lib/agentic/runtime/utils';
import type { MissionRuntimeContext, MissionStepResult } from '@/lib/agentic/runtime/types';

export async function runSupportMissionStep(context: MissionRuntimeContext): Promise<MissionStepResult | null> {
  const { intent, merchant, currentStepIdx, currentStepText } = context;

  if (intent.intent_type !== 'support_triage') {
    return null;
  }

  const constraints = intent.constraints || {};
  const requestType = String(constraints.request_type || 'support');
  const customerEmail = String(constraints.customer_email || intent.consumer_email || '').toLowerCase();
  const orderId = typeof constraints.order_id === 'string' ? constraints.order_id : null;
  const topic = String(constraints.topic || constraints.refund_reason || 'customer request');

  const isAuditStep = currentStepText.includes('classify') || currentStepText.includes('audit') || currentStepText.includes('identify') || currentStepIdx === 0;
  const isAckStep = (currentStepText.includes('acknowledgment') || currentStepText.includes('respond') || currentStepText.includes('send') || currentStepIdx === 1) && !isAuditStep;
  const isEscalateStep = (currentStepText.includes('escalate') || currentStepText.includes('create') || currentStepText.includes('queue') || currentStepIdx === 2) && !isAuditStep && !isAckStep;

  if (isAuditStep) {
    return {
      actionTaken: true,
      logMessage: requestType === 'refund'
        ? `Classified storefront refund request for order ${orderId ? orderId.slice(0, 8) : 'unknown'} from ${customerEmail || 'customer'}.`
        : `Classified storefront support request "${topic}" from ${customerEmail || 'customer'}.`,
    };
  }

  if (isAckStep) {
    if (!customerEmail) {
      return {
        actionTaken: true,
        logMessage: 'Support acknowledgment skipped because no customer email was available.',
      };
    }

    const subject = requestType === 'refund'
      ? `Refund request received by ${merchant.store_name}`
      : `Support request received by ${merchant.store_name}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 12px;">We received your request</h2>
        <p style="color: #444; line-height: 1.6;">
          ${requestType === 'refund'
            ? `Your refund request${orderId ? ` for order <strong>${orderId}</strong>` : ''} is now being reviewed by ${merchant.store_name}.`
            : `Your support request about <strong>${topic}</strong> has been routed to ${merchant.store_name}.`}
        </p>
        <p style="color: #444; line-height: 1.6;">
          We will follow up as soon as the merchant team completes the review.
        </p>
      </div>
    `;

    try {
      const response = await sendInternalEmail({
        to: customerEmail,
        subject,
        html,
        merchantId: intent.merchant_id,
      });
      const result = await response.json();
      if (result?.success) {
        return {
          actionTaken: true,
          logMessage: `Sent customer acknowledgment to ${customerEmail}.`,
        };
      }
    } catch (error) {
      logger.error('Failed to send support acknowledgment:', error);
    }

    return {
      actionTaken: true,
      logMessage: `Customer acknowledgment could not be delivered to ${customerEmail}, but the case was kept in the merchant queue.`,
    };
  }

  if (isEscalateStep) {
    await createSupportCase({
      merchantId: intent.merchant_id,
      actorType: 'agent',
      name: String(intent.consumer_email || 'Storefront customer'),
      email: intent.consumer_email || null,
      message: String(intent.goal || 'Support mission escalation'),
      context: { missionId: intent.id },
    });

    return {
      actionTaken: true,
      logMessage: requestType === 'refund'
        ? `Escalated refund case${orderId ? ` for order ${orderId.slice(0, 8)}` : ''} with customer context attached.`
        : `Escalated support case "${topic}" with storefront context attached.`,
    };
  }

  return null;
}
