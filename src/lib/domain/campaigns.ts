import { supabaseAdmin } from '@/lib/supabase-admin';
import { logDomainEvent } from '@/lib/agentic/events';
import { sendEmailCampaign } from '@/app/(merchant)/marketing/actions';

interface CreateCampaignDraftInput {
  merchantId: string
  actorType: 'user' | 'agent' | 'system'
  name: string
  content: Record<string, unknown>
  segmentId?: string | null
  scheduleAt?: string | null
  context?: Record<string, unknown>
}

export async function createEmailCampaignDraft(input: CreateCampaignDraftInput) {
  const payload = {
    merchant_id: input.merchantId,
    name: input.name,
    segment_id: input.segmentId || null,
    content: input.content,
    status: input.scheduleAt ? 'scheduled' : 'draft',
    scheduled_at: input.scheduleAt || null,
  };

  const { data, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create campaign draft');
  }

  await logDomainEvent({
    merchantId: input.merchantId,
    type: 'campaign_created',
    title: 'Campaign created',
    summary: `${data.name} was created as a ${payload.status} email campaign.`,
    actor: input.actorType,
    factors: {
      campaignId: data.id,
      ...(input.context || {}),
    },
    outcome: {
      status: payload.status,
    },
  });

  return data;
}

export async function executeEmailCampaign(campaignId: string, merchantId: string) {
  return sendEmailCampaign(campaignId, merchantId);
}
