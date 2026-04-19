import { supabaseAdmin } from '@/lib/supabase-admin';
import { createMerchantMissionFromGoal } from '@/lib/agentic/missions';
import { DEFAULT_AGENTIC_TRIGGER_SETTINGS } from '@/lib/agentic/trigger-config';
import type { AgenticTriggerSettings, Merchant } from '@/types';

type TriggerKey = keyof AgenticTriggerSettings;

type MerchantWithTriggerFields = Omit<Merchant, 'notification_settings'> & {
  notification_settings?: Record<string, unknown> | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getMerchantTriggerSettings(merchant: MerchantWithTriggerFields): AgenticTriggerSettings {
  const rawNotificationSettings = isRecord(merchant.notification_settings) ? merchant.notification_settings : {};
  const rawTriggers = isRecord(rawNotificationSettings.agentic_triggers) ? rawNotificationSettings.agentic_triggers : {};

  const readRule = (key: TriggerKey): AgenticTriggerSettings[TriggerKey] => {
    const raw = isRecord(rawTriggers[key]) ? rawTriggers[key] : {};
    return {
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_AGENTIC_TRIGGER_SETTINGS[key].enabled,
      cooldownHours: Number.isFinite(Number(raw.cooldownHours))
        ? Math.max(1, Number(raw.cooldownHours))
        : DEFAULT_AGENTIC_TRIGGER_SETTINGS[key].cooldownHours,
      minCount: Number.isFinite(Number(raw.minCount))
        ? Math.max(1, Number(raw.minCount))
        : DEFAULT_AGENTIC_TRIGGER_SETTINGS[key].minCount,
    };
  };

  return {
    abandonedCartRecovery: readRule('abandonedCartRecovery'),
    lowStockRisk: readRule('lowStockRisk'),
    deadInventoryCleanup: readRule('deadInventoryCleanup'),
  };
}

async function hasRecentAutoTriggerMission(
  merchantId: string,
  intentType: string,
  cooldownHours: number
) {
  const { data: activeMissions } = await supabaseAdmin
    .from('customer_intents')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('intent_type', intentType)
    .eq('status', 'active')
    .contains('constraints', { origin: 'auto_trigger_engine' })
    .limit(1);

  if (activeMissions && activeMissions.length > 0) {
    return true;
  }

  const threshold = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('customer_intents')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('intent_type', intentType)
    .gte('created_at', threshold)
    .contains('constraints', { origin: 'auto_trigger_engine' })
    .limit(1);

  return Boolean(data && data.length > 0);
}

async function detectAbandonedCartSignal(merchant: MerchantWithTriggerFields, settings: AgenticTriggerSettings) {
  if (!settings.abandonedCartRecovery.enabled || merchant.abandoned_cart_recovery_enabled === false) {
    return null;
  }

  if (await hasRecentAutoTriggerMission(merchant.id, 'recover_abandoned_carts', settings.abandonedCartRecovery.cooldownHours)) {
    return null;
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('abandoned_carts')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)
    .eq('recovery_email_sent', false)
    .not('customer_email', 'is', null)
    .lt('created_at', oneHourAgo)
    .gt('created_at', twentyFourHoursAgo);

  if ((count || 0) < settings.abandonedCartRecovery.minCount) {
    return null;
  }

  return {
    goalType: 'recover_abandoned_carts' as const,
    goal: `Recover ${count} stalled carts before they go cold`,
  };
}

async function detectLowStockSignal(merchant: MerchantWithTriggerFields, settings: AgenticTriggerSettings) {
  if (!settings.lowStockRisk.enabled || merchant.low_stock_alerts_enabled === false) {
    return null;
  }

  if (await hasRecentAutoTriggerMission(merchant.id, 'reduce_low_stock', settings.lowStockRisk.cooldownHours)) {
    return null;
  }

  const threshold = merchant.low_stock_threshold || 10;
  const { count } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)
    .eq('status', 'active')
    .gt('stock_quantity', 0)
    .lte('stock_quantity', threshold);

  if ((count || 0) < settings.lowStockRisk.minCount) {
    return null;
  }

  return {
    goalType: 'reduce_low_stock' as const,
    goal: `Protect revenue from ${count} low-stock products`,
  };
}

async function detectDeadInventorySignal(merchant: MerchantWithTriggerFields, settings: AgenticTriggerSettings) {
  if (!settings.deadInventoryCleanup.enabled) {
    return null;
  }

  if (await hasRecentAutoTriggerMission(merchant.id, 'clear_dead_inventory', settings.deadInventoryCleanup.cooldownHours)) {
    return null;
  }

  const createdBefore = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const updatedBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)
    .eq('status', 'active')
    .gt('stock_quantity', 5)
    .lt('created_at', createdBefore)
    .lt('updated_at', updatedBefore);

  if ((count || 0) < settings.deadInventoryCleanup.minCount) {
    return null;
  }

  return {
    goalType: 'clear_dead_inventory' as const,
    goal: `Clear ${count} stale products with low recent merchandising activity`,
  };
}

export async function evaluateMerchantAgentTriggers(merchant: MerchantWithTriggerFields) {
  const settings = getMerchantTriggerSettings(merchant);
  const createdMissions = [];
  const skipped: string[] = [];
  const missionMerchant: Merchant = {
    ...merchant,
    notification_settings: merchant.notification_settings || undefined,
  };

  const signals = await Promise.all([
    detectAbandonedCartSignal(merchant, settings),
    detectLowStockSignal(merchant, settings),
    detectDeadInventorySignal(merchant, settings),
  ]);

  for (const signal of signals) {
    if (!signal) {
      continue;
    }

    const created = await createMerchantMissionFromGoal(
      missionMerchant,
      signal.goalType,
      signal.goal,
      { origin: 'auto_trigger_engine', actor: 'system' }
    );
    createdMissions.push(created.mission);
  }

  if (createdMissions.length === 0) {
    skipped.push('No trigger thresholds were met.');
  }

  return {
    merchantId: merchant.id,
    settings,
    createdMissions,
    skipped,
  };
}

export async function evaluateAgentTriggersForAllMerchants() {
  const { data: merchants, error } = await supabaseAdmin
    .from('merchants')
    .select('id, user_id, store_name, subdomain, currency, locale, notification_settings, abandoned_cart_recovery_enabled, low_stock_alerts_enabled, low_stock_threshold, store_email, email');

  if (error) {
    throw error;
  }

  const results = [];
  for (const merchant of (merchants || []) as MerchantWithTriggerFields[]) {
    results.push(await evaluateMerchantAgentTriggers(merchant));
  }

  return results;
}
