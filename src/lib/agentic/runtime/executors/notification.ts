import { baileysSend } from '@/lib/baileys-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';
import { sendInternalEmail } from '@/lib/agentic/runtime/utils';
import type { MissionRuntimeContext, MissionStepResult } from '@/lib/agentic/runtime/types';

export async function runNotificationMissionStep(context: MissionRuntimeContext): Promise<MissionStepResult | null> {
  const { plan, intent, merchant, currentStepText } = context;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const storefrontUrl =
    merchant.custom_domain && merchant.domain_verified
      ? `https://${merchant.custom_domain}`
      : `${appUrl}/store/${merchant.subdomain}`;

  if (!(currentStepText.includes('alert') || currentStepText.includes('email') || currentStepText.includes('notify') || currentStepText.includes('nudge'))) {
    return null;
  }

  const { data: prevLogs, error: prevLogsError } = await supabaseAdmin
    .from('agent_action_logs')
    .select('*')
    .eq('plan_id', plan.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (prevLogsError) {
    return null;
  }

  if (!prevLogs || prevLogs.length === 0) {
    return null;
  }

  const emailSubject = `Agent Update: ${intent.goal}`;
  const isNudge = currentStepText.includes('nudge');
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background: #fff;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #000; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold;">AI</div>
          <h2 style="margin: 0; color: #000; font-size: 18px;">${isNudge ? 'Special Offer' : 'Mission Update'}</h2>
        </div>
        <p style="color: #666; font-size: 14px;">Your shopping agent for <strong>${merchant.store_name}</strong> has news:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #eaeaea; margin: 20px 0;">
          <p style="margin: 0; font-style: italic; color: #333;">"${prevLogs[0].description}"</p>
        </div>
        <a href="${storefrontUrl}" style="display: block; background: #000; color: #fff; padding: 14px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center;">Continue shopping</a>
    </div>
  `;

  try {
    const emailResponse = await sendInternalEmail({
      to: intent.consumer_email,
      subject: emailSubject,
      html: emailHtml,
      merchantId: intent.merchant_id,
    });

    const emailResult = await emailResponse.json();
    if (emailResult.success) {
      let logMessage = `Autonomous nudge sent to ${intent.consumer_email}`;

      const { data: waSession } = await supabaseAdmin
        .from('whatsapp_sessions')
        .select('phone_number')
        .eq('email', intent.consumer_email)
        .eq('merchant_id', intent.merchant_id)
        .eq('email_verified', true)
        .single();

      if (waSession?.phone_number) {
        try {
          const waText = `Agent update: ${intent.goal}\n\n${prevLogs[0].description}\n\nContinue shopping: ${storefrontUrl}`;
          await baileysSend(merchant.id, waSession.phone_number, waText);
          logMessage += ` (and WhatsApp to ${waSession.phone_number})`;
        } catch (waErr) {
          logger.error('Failed to send WhatsApp mission nudge:', waErr);
        }
      }

      return {
        actionTaken: true,
        logMessage,
      };
    }

    return {
      actionTaken: false,
      logMessage: `Nudge failed for ${intent.consumer_email}: email delivery unsuccessful`,
    };
  } catch {
    return {
      actionTaken: false,
      logMessage: `Failed nudge for ${intent.consumer_email}`,
    };
  }
}
