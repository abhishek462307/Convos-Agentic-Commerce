import { supabaseAdmin } from '@/lib/supabase-admin';
import { processAbandonedCartRecoveryForMerchant } from '@/lib/automation/abandoned-cart-recovery';
import type { MissionRuntimeContext, MissionStepResult } from '@/lib/agentic/runtime/types';

async function countRecoverableCarts(merchantId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('abandoned_carts')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('recovery_email_sent', false)
    .not('customer_email', 'is', null)
    .lt('created_at', oneHourAgo)
    .gt('created_at', twentyFourHoursAgo);

  return count || 0;
}

async function countLowStockProducts(merchantId: string, threshold: number) {
  const { count } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('status', 'active')
    .gt('stock_quantity', 0)
    .lte('stock_quantity', threshold);

  return count || 0;
}

async function countDeadInventoryProducts(merchantId: string) {
  const createdBefore = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const updatedBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('status', 'active')
    .gt('stock_quantity', 5)
    .lt('created_at', createdBefore)
    .lt('updated_at', updatedBefore);

  return count || 0;
}

export async function runSignalMissionStep(context: MissionRuntimeContext): Promise<MissionStepResult | null> {
  const { intent, merchant, currentStepIdx, currentStepText } = context;

  if (intent.intent_type === 'recover_abandoned_carts') {
    const recoverableCarts = await countRecoverableCarts(intent.merchant_id);
    if (recoverableCarts === 0) {
      return {
        actionTaken: false,
        logMessage: 'No recoverable carts currently match the trigger window.',
        terminalStatus: 'completed',
        intentStatus: 'completed',
      };
    }

    const isAuditStep = currentStepText.includes('identify') || currentStepText.includes('find') || currentStepText.includes('scan') || currentStepIdx === 0;
    const isChannelStep = (currentStepText.includes('channel') || currentStepText.includes('select') || currentStepText.includes('choose') || currentStepIdx === 1) && !isAuditStep;
    const isLaunchStep = (currentStepText.includes('launch') || currentStepText.includes('send') || currentStepText.includes('activate') || currentStepIdx === 2) && !isAuditStep && !isChannelStep;

    if (isAuditStep) {
      return { actionTaken: true, logMessage: `Identified ${recoverableCarts} recoverable carts for follow-up.` };
    }

    if (isChannelStep) {
      return { actionTaken: true, logMessage: `Selected email recovery as the active follow-up channel for ${recoverableCarts} carts.` };
    }

    if (isLaunchStep) {
      const delivery = await processAbandonedCartRecoveryForMerchant(intent.merchant_id, {
        id: merchant.id,
        store_name: merchant.store_name,
        subdomain: merchant.subdomain,
        currency: merchant.currency,
        smtp_enabled: merchant.smtp_enabled,
        smtp_host: merchant.smtp_host,
        smtp_port: merchant.smtp_port,
        smtp_user: merchant.smtp_user,
        smtp_password: merchant.smtp_password,
        smtp_from_email: merchant.smtp_from_email,
        smtp_from_name: merchant.smtp_from_name,
      });

      if (delivery.sent > 0) {
        return { actionTaken: true, logMessage: `Sent ${delivery.sent} recovery emails${delivery.failed > 0 ? `, ${delivery.failed} failed` : ''}.` };
      }

      return { actionTaken: false, logMessage: 'Recovery outreach could not be sent for the current cart set.' };
    }
  }

  if (intent.intent_type === 'reduce_low_stock') {
    const lowStockCount = await countLowStockProducts(intent.merchant_id, Number(merchant.low_stock_threshold || 10));
    if (lowStockCount === 0) {
      return {
        actionTaken: false,
        logMessage: 'Low-stock pressure has cleared since the mission was created.',
        terminalStatus: 'completed',
        intentStatus: 'completed',
      };
    }

    const isAuditStep = currentStepText.includes('confirm') || currentStepText.includes('identify') || currentStepText.includes('scan') || currentStepIdx === 0;
    const isDraftStep = (currentStepText.includes('prepare') || currentStepText.includes('draft') || currentStepIdx === 1) && !isAuditStep;
    const isLaunchStep = (currentStepText.includes('queue') || currentStepText.includes('apply') || currentStepText.includes('launch') || currentStepIdx === 2) && !isAuditStep && !isDraftStep;

    if (isAuditStep) {
      return { actionTaken: true, logMessage: `Confirmed ${lowStockCount} active products are still below the low-stock threshold.` };
    }

    if (isDraftStep) {
      return { actionTaken: true, logMessage: `Prepared replenishment and merchandising guidance for ${lowStockCount} low-stock products.` };
    }

    if (isLaunchStep) {
      return { actionTaken: true, logMessage: `Queued substitute and promotion-safety recommendations for ${lowStockCount} low-stock products.` };
    }
  }

  if (intent.intent_type === 'clear_dead_inventory') {
    const staleProductCount = await countDeadInventoryProducts(intent.merchant_id);
    if (staleProductCount === 0) {
      return {
        actionTaken: false,
        logMessage: 'No stale inventory currently matches the cleanup rule.',
        terminalStatus: 'completed',
        intentStatus: 'completed',
      };
    }

    const isAuditStep = currentStepText.includes('confirm') || currentStepText.includes('identify') || currentStepText.includes('scan') || currentStepIdx === 0;
    const isDraftStep = (currentStepText.includes('prepare') || currentStepText.includes('draft') || currentStepIdx === 1) && !isAuditStep;
    const isLaunchStep = (currentStepText.includes('queue') || currentStepText.includes('activate') || currentStepText.includes('launch') || currentStepIdx === 2) && !isAuditStep && !isDraftStep;

    if (isAuditStep) {
      return { actionTaken: true, logMessage: `Confirmed ${staleProductCount} stale products still need cleanup attention.` };
    }

    if (isDraftStep) {
      return { actionTaken: true, logMessage: `Prepared cleanup recommendations for ${staleProductCount} stale products.` };
    }

    if (isLaunchStep) {
      return { actionTaken: true, logMessage: `Queued sell-through recommendations for ${staleProductCount} stale products.` };
    }
  }

  return null;
}
