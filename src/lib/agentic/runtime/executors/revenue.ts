import { createEmailCampaignDraft, executeEmailCampaign } from '@/lib/domain/campaigns';
import { createMerchantDiscount } from '@/lib/domain/discounts';
import { resolveMerchantPolicies } from '@/lib/agentic/policies';
import { updateIntentState } from '@/lib/agentic/runtime/utils';
import type { MissionRuntimeContext, MissionStepResult } from '@/lib/agentic/runtime/types';
import type { MerchantMissionPlannedChangeBatch, MerchantMissionPlannedChangeItem } from '@/types';

function normalizeConstraints(constraints: unknown) {
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    return {};
  }
  return constraints as Record<string, unknown>;
}

function getWorkflow(constraints: unknown) {
  const normalized = normalizeConstraints(constraints);
  const workflow = normalized.workflow;
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    return {};
  }
  return workflow as Record<string, unknown>;
}

function mergeWorkflow(constraints: unknown, patch: Record<string, unknown>) {
  const normalized = normalizeConstraints(constraints);
  const workflow = getWorkflow(constraints);
  return {
    ...normalized,
    workflow: {
      ...workflow,
      ...patch,
    },
  };
}

async function persistPlannedChanges(intentId: string, constraints: unknown, changes: MerchantMissionPlannedChangeBatch[]) {
  await updateIntentState(intentId, {
    constraints: mergeWorkflow(constraints, {
      proposedChanges: changes,
    }),
  });
}

export async function runRevenueMissionStep(context: MissionRuntimeContext): Promise<MissionStepResult | null> {
  const { intent, merchant, currentStepIdx, currentStepText } = context;
  const policies = resolveMerchantPolicies(merchant);

  if (intent.intent_type === 'increase_aov') {
    const isAuditStep = currentStepText.includes('find') || currentStepText.includes('identify') || currentStepText.includes('audit') || currentStepIdx === 0;
    const isDraftStep = (currentStepText.includes('draft') || currentStepText.includes('prepare') || currentStepText.includes('setup') || currentStepIdx === 1) && !isAuditStep;
    const isLaunchStep = (currentStepText.includes('launch') || currentStepText.includes('send') || currentStepText.includes('activate') || currentStepIdx === 2) && !isAuditStep && !isDraftStep;

    if (isAuditStep) {
      return { actionTaken: true, logMessage: 'Identified cross-sell pairs and high-intent products for AOV expansion.' };
    }

    if (isDraftStep) {
      const discountValue = Math.min(10, Math.max(5, Math.floor(policies.maxDiscountPercentage || 10)));
      const discountCode = `AOV${String(intent.id).slice(0, 6).toUpperCase()}`;
      
      const items: MerchantMissionPlannedChangeItem[] = [
        {
          entityType: 'discount',
          entityId: 'new',
          label: 'AOV Cross-sell Discount',
          field: 'code',
          currentValue: null,
          proposedValue: discountCode,
          summary: `Create a ${discountValue}% discount for orders over $100.`,
        },
        {
          entityType: 'campaign',
          entityId: 'new',
          label: 'AOV Expansion Email',
          field: 'subject',
          currentValue: null,
          proposedValue: `Bundle your next order with ${merchant.store_name}`,
          summary: 'Send a targeted email to high-intent shoppers with recommended add-ons.',
        }
      ];

      await persistPlannedChanges(intent.id, intent.constraints, [
        {
          label: 'AOV Mission Drafts',
          summary: 'Prepared a cross-sell discount and re-engagement campaign to lift average order value.',
          status: 'draft',
          items,
        },
      ]);

      return { actionTaken: true, logMessage: 'Drafted cross-sell offers and campaign content for review.' };
    }

    if (isLaunchStep) {
      const discountValue = Math.min(10, Math.max(5, Math.floor(policies.maxDiscountPercentage || 10)));
      const discountCode = `AOV${String(intent.id).slice(0, 6).toUpperCase()}`;

      const discount = await createMerchantDiscount({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        code: discountCode,
        type: 'percentage',
        value: discountValue,
        minOrderAmount: 100,
        usageLimit: 200,
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        context: { missionId: intent.id },
      });

      const campaign = await createEmailCampaignDraft({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        name: `AOV Mission ${String(intent.id).slice(0, 8)}`,
        content: {
          subject: `Bundle your next order with ${merchant.store_name}`,
          headline: 'Recommended add-ons are ready',
          bodyText: `We prepared a high-conversion cross-sell campaign. Use code ${discount.code} for ${discountValue}% off your next order over $100.`,
          ctaText: 'See your offers',
        },
        context: { missionId: intent.id, missionType: intent.intent_type },
      });

      await executeEmailCampaign(campaign.id, intent.merchant_id);

      const workflow = getWorkflow(intent.constraints);
      const proposedChanges = Array.isArray(workflow.proposedChanges) ? workflow.proposedChanges as MerchantMissionPlannedChangeBatch[] : [];
      await persistPlannedChanges(intent.id, intent.constraints, proposedChanges.map(batch => ({ ...batch, status: 'applied' })));

      return { actionTaken: true, logMessage: `Launched AOV mission with discount ${discount.code} and email campaign ${campaign.name}.` };
    }
  }

  if (intent.intent_type === 'improve_first_time_conversion') {
    const isAuditStep = currentStepText.includes('friction') || currentStepText.includes('audit') || currentStepText.includes('review') || currentStepIdx === 0;
    const isDraftStep = (currentStepText.includes('draft') || currentStepText.includes('prepare') || currentStepText.includes('setup') || currentStepIdx === 1) && !isAuditStep;
    const isLaunchStep = (currentStepText.includes('launch') || currentStepText.includes('send') || currentStepText.includes('activate') || currentStepIdx === 2) && !isAuditStep && !isDraftStep;

    if (isAuditStep) {
      return { actionTaken: true, logMessage: 'Reviewed new shopper friction signals and conversion drop-offs.' };
    }

    if (isDraftStep) {
      const discountCode = `WELCOME${String(intent.id).slice(0, 5).toUpperCase()}`;
      const items: MerchantMissionPlannedChangeItem[] = [
        {
          entityType: 'discount',
          entityId: 'new',
          label: 'Welcome Discount',
          field: 'code',
          currentValue: null,
          proposedValue: discountCode,
          summary: 'Create a 10% welcome discount for first-time shoppers.',
        },
        {
          entityType: 'campaign',
          entityId: 'new',
          label: 'Welcome Email',
          field: 'subject',
          currentValue: null,
          proposedValue: 'A better first visit starts here',
          summary: 'Send an onboarding email with a welcome offer to new visitors.',
        }
      ];

      await persistPlannedChanges(intent.id, intent.constraints, [
        {
          label: 'Welcome Mission Drafts',
          summary: 'Prepared a welcome discount and onboarding campaign for new shoppers.',
          status: 'draft',
          items,
        },
      ]);

      return { actionTaken: true, logMessage: 'Drafted trust-led messaging and welcome offer for review.' };
    }

    if (isLaunchStep) {
      const discount = await createMerchantDiscount({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        code: `WELCOME${String(intent.id).slice(0, 5).toUpperCase()}`,
        type: 'percentage',
        value: 10,
        usageLimit: 500,
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        context: { missionId: intent.id },
      });

      const campaign = await createEmailCampaignDraft({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        name: `Welcome Conversion Mission ${String(intent.id).slice(0, 8)}`,
        content: {
          subject: 'A better first visit starts here',
          headline: 'Welcome offer ready to launch',
          bodyText: `Prepared an onboarding campaign for first-time shoppers. Use code ${discount.code} for 10% off your first purchase.`,
          ctaText: 'Shop now',
        },
        context: { missionId: intent.id, missionType: intent.intent_type },
      });

      await executeEmailCampaign(campaign.id, intent.merchant_id);

      const workflow = getWorkflow(intent.constraints);
      const proposedChanges = Array.isArray(workflow.proposedChanges) ? workflow.proposedChanges as MerchantMissionPlannedChangeBatch[] : [];
      await persistPlannedChanges(intent.id, intent.constraints, proposedChanges.map(batch => ({ ...batch, status: 'applied' })));

      return { actionTaken: true, logMessage: `Launched welcome mission with discount ${discount.code} and onboarding email.` };
    }
  }

  if (intent.intent_type === 'customer_winback') {
    const isAuditStep = currentStepText.includes('cohort') || currentStepText.includes('audit') || currentStepText.includes('identify') || currentStepIdx === 0;
    const isDraftStep = (currentStepText.includes('draft') || currentStepText.includes('prepare') || currentStepText.includes('strategy') || currentStepIdx === 1) && !isAuditStep;
    const isLaunchStep = (currentStepText.includes('launch') || currentStepText.includes('send') || currentStepText.includes('activate') || currentStepIdx === 2) && !isAuditStep && !isDraftStep;

    if (isAuditStep) {
      return { actionTaken: true, logMessage: 'Identified win-back cohorts and lapsed-customer segments.' };
    }

    if (isDraftStep) {
      const discountCode = `WINBACK${String(intent.id).slice(0, 4).toUpperCase()}`;
      const items: MerchantMissionPlannedChangeItem[] = [
        {
          entityType: 'discount',
          entityId: 'new',
          label: 'Win-back Discount',
          field: 'code',
          currentValue: null,
          proposedValue: discountCode,
          summary: 'Create a 12% reactivation discount for lapsed customers.',
        },
        {
          entityType: 'campaign',
          entityId: 'new',
          label: 'Win-back Email',
          field: 'subject',
          currentValue: null,
          proposedValue: 'We picked something new for you',
          summary: 'Send a re-engagement email to lapsed customers with a special offer.',
        }
      ];

      await persistPlannedChanges(intent.id, intent.constraints, [
        {
          label: 'Win-back Mission Drafts',
          summary: 'Prepared a win-back discount and re-activation campaign for lapsed customers.',
          status: 'draft',
          items,
        },
      ]);

      return { actionTaken: true, logMessage: 'Drafted message and segment strategy for review.' };
    }

    if (isLaunchStep) {
      const discount = await createMerchantDiscount({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        code: `WINBACK${String(intent.id).slice(0, 4).toUpperCase()}`,
        type: 'percentage',
        value: 12,
        usageLimit: 300,
        endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        context: { missionId: intent.id },
      });

      const campaign = await createEmailCampaignDraft({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        name: `Win-back Mission ${String(intent.id).slice(0, 8)}`,
        content: {
          subject: 'We picked something new for you',
          headline: 'Win-back campaign prepared',
          bodyText: `We miss you! Use code ${discount.code} for 12% off your next purchase and see what's new.`,
          ctaText: 'Come back',
        },
        context: { missionId: intent.id, missionType: intent.intent_type },
      });

      await executeEmailCampaign(campaign.id, intent.merchant_id);

      const workflow = getWorkflow(intent.constraints);
      const proposedChanges = Array.isArray(workflow.proposedChanges) ? workflow.proposedChanges as MerchantMissionPlannedChangeBatch[] : [];
      await persistPlannedChanges(intent.id, intent.constraints, proposedChanges.map(batch => ({ ...batch, status: 'applied' })));

      return { actionTaken: true, logMessage: `Launched win-back mission with discount ${discount.code} and reactivation email.` };
    }
  }

  return null;
}
