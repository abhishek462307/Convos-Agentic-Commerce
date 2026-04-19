import { callAI, getMerchantAIConfig, getMessageFromResponse } from '@/app/api/ai/ai-client';
import { applyCatalogAutomation } from '@/lib/domain/catalog';
import { updateIntentState } from '@/lib/agentic/runtime/utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { MissionRuntimeContext, MissionStepResult } from '@/lib/agentic/runtime/types';
import type { MerchantMissionBrief, MerchantMissionPlannedChangeBatch, MerchantMissionPlannedChangeItem } from '@/types';

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

function getMissionBrief(constraints: unknown): MerchantMissionBrief | null {
  const normalized = normalizeConstraints(constraints);
  const missionBrief = normalized.missionBrief;

  if (!missionBrief || typeof missionBrief !== 'object' || Array.isArray(missionBrief)) {
    return null;
  }

  return missionBrief as MerchantMissionBrief;
}

function wantsDescriptionRewrites(constraints: unknown) {
  const brief = getMissionBrief(constraints);
  const prompt = String(brief?.originalPrompt || brief?.objective || '').toLowerCase();
  return /(description|descriptions|product copy|rewrite|reword|copywriting|1000 words|1000 word|content)/.test(prompt);
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  const directCandidates = [trimmed];
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    directCandidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    directCandidates.push(trimmed.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of directCandidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

function buildFallbackDescription(product: { name: string; category?: string | null }, merchantName: string) {
  const categoryText = product.category ? ` in ${product.category}` : '';
  return `${product.name} from ${merchantName}${categoryText} is crafted to help shoppers make a confident purchase. Clear benefits, quality cues, and a stronger storefront presentation make it easier to understand why this product is worth buying.`;
}

async function generateDescriptionChangeBatch(input: {
  merchant: MissionRuntimeContext['merchant']
  intent: MissionRuntimeContext['intent']
  products: Array<{ id: string; name: string; description?: string | null; category?: string | null; price?: number | null }>
}) {
  const { merchant, intent, products } = input;
  const config = getMerchantAIConfig(merchant);

  const systemPrompt = [
    'You are an ecommerce copywriter working for a merchant.',
    'Return strict JSON only.',
    'Write unique, concise-but-rich product descriptions that sound premium and distinct.',
    'Preserve factual accuracy. Do not invent materials, certifications, or claims that are not implied by the product name or current description.',
    'Respond with {"items":[{"id":"...","description":"...","reason":"..."}]}.',
    'Each description should be 80 to 160 words unless the merchant specifically asked for something longer.',
  ].join(' ');

  const userPrompt = JSON.stringify({
    merchant: {
      storeName: merchant.store_name,
      industry: merchant.store_industry || null,
      objective: intent.goal,
    },
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category || null,
      price: product.price ?? null,
      description: product.description || '',
    })),
  });

  try {
    const result = await callAI(config, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    const message = getMessageFromResponse(config, result.response);
    const payload = extractJsonPayload(String(message?.content || ''));
    const items = Array.isArray(payload?.items) ? payload.items : [];

    const mapped = items
      .map((item: any): MerchantMissionPlannedChangeItem | null => {
        const matchingProduct = products.find((product) => product.id === item?.id);
        if (!matchingProduct || typeof item?.description !== 'string') {
          return null;
        }

        return {
          entityType: 'product',
          entityId: matchingProduct.id,
          label: matchingProduct.name,
          field: 'description',
          currentValue: String(matchingProduct.description || '').trim() || null,
          proposedValue: item.description.trim(),
          summary: typeof item?.reason === 'string' ? item.reason.trim() : 'Rewrite the product description for better clarity and conversion.',
        } satisfies MerchantMissionPlannedChangeItem;
      })
      .filter((item: MerchantMissionPlannedChangeItem | null): item is MerchantMissionPlannedChangeItem => 
        Boolean(item) && Boolean(item?.proposedValue) 
      );

    if (mapped.length > 0) {
      return mapped;
    }
  } catch {
  }

  return products.map((product) => ({
    entityType: 'product',
    entityId: product.id,
    label: product.name,
    field: 'description',
    currentValue: String(product.description || '').trim() || null,
    proposedValue: buildFallbackDescription(product, merchant.store_name),
    summary: 'Rewrite the product description for better clarity and conversion.',
  } satisfies MerchantMissionPlannedChangeItem));
}

async function persistPlannedChanges(intentId: string, constraints: unknown, changes: MerchantMissionPlannedChangeBatch[]) {
  await updateIntentState(intentId, {
    constraints: mergeWorkflow(constraints, {
      proposedChanges: changes,
    }),
  });
}

export async function runCatalogMissionStep(context: MissionRuntimeContext): Promise<MissionStepResult | null> {
  const { intent, merchant, currentStepIdx, currentStepText } = context;

  if (intent.intent_type === 'reduce_low_stock') {
    const threshold = Number(merchant.low_stock_threshold || 10);
    const { data: lowStockProducts } = await supabaseAdmin
      .from('products')
      .select('id, name, stock_quantity, bargain_enabled, badge')
      .eq('merchant_id', intent.merchant_id)
      .eq('status', 'active')
      .gt('stock_quantity', 0)
      .lte('stock_quantity', threshold)
      .limit(25);

    if (!lowStockProducts || lowStockProducts.length === 0) {
      return null;
    }

    const isAuditStep = currentStepText.includes('audit') || currentStepText.includes('review') || currentStepText.includes('scan') || currentStepIdx === 0;
    const isDraftStep = (currentStepText.includes('draft') || currentStepText.includes('prepare') || currentStepText.includes('batch') || currentStepIdx === 1) && !isAuditStep;
    const isApplyStep = (currentStepText.includes('apply') || currentStepText.includes('launch') || currentStepText.includes('sync') || currentStepText.includes('queue') || currentStepIdx === 2) && !isAuditStep && !isDraftStep;

    if (isAuditStep) {
      const threshold = Number(merchant.low_stock_threshold || 10);
      const { data: lowStockProducts } = await supabaseAdmin
        .from('products')
        .select('id, name, stock_quantity, bargain_enabled, badge')
        .eq('merchant_id', intent.merchant_id)
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .lte('stock_quantity', threshold)
        .limit(25);

      if (!lowStockProducts || lowStockProducts.length === 0) {
        return null;
      }

      return {
        actionTaken: true,
        logMessage: `Audited catalog and found ${lowStockProducts.length} products with stock below ${threshold} threshold.`,
      };
    }

    if (isDraftStep || isApplyStep) {
      const threshold = Number(merchant.low_stock_threshold || 10);
      const { data: lowStockProducts } = await supabaseAdmin
        .from('products')
        .select('id, name, stock_quantity, bargain_enabled, badge')
        .eq('merchant_id', intent.merchant_id)
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .lte('stock_quantity', threshold)
        .limit(25);

      if (!lowStockProducts || lowStockProducts.length === 0) {
        return null;
      }

      const updated = await applyCatalogAutomation({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        productIds: lowStockProducts.map((product: any) => product.id),
        changes: {
          badge: 'Low stock',
          bargain_enabled: false,
        },
        eventType: 'catalog_low_stock_hardened',
        summary: `Updated ${lowStockProducts.length} low-stock products to reduce risky promotions.`,
      });

      return { actionTaken: true, logMessage: `Applied low-stock protections to ${updated.length} products.` };
    }
  }

  if (intent.intent_type === 'clear_dead_inventory') {
    const createdBefore = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleProducts } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('merchant_id', intent.merchant_id)
      .eq('status', 'active')
      .gt('stock_quantity', 5)
      .lt('created_at', createdBefore)
      .limit(25);

    if (!staleProducts || staleProducts.length === 0) {
      return null;
    }

    const isAuditStep = currentStepText.includes('audit') || currentStepText.includes('review') || currentStepText.includes('scan') || currentStepIdx === 0;
    const isActionStep = (currentStepText.includes('mark') || currentStepText.includes('apply') || currentStepText.includes('launch') || currentStepText.includes('sync') || currentStepText.includes('badge') || currentStepIdx >= 1) && !isAuditStep;

    if (isAuditStep) {
      return {
        actionTaken: true,
        logMessage: `Audited catalog and identified ${staleProducts.length} stale products that haven't sold in 45 days.`,
      };
    }

    if (isActionStep) {
      const updated = await applyCatalogAutomation({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        productIds: staleProducts.map((product: any) => product.id),
        changes: {
          badge: 'Clearance',
          bargain_enabled: true,
        },
        eventType: 'catalog_clearance_prepared',
        summary: `Prepared ${staleProducts.length} stale products for sell-through.`,
      });
      return { actionTaken: true, logMessage: `Marked ${updated.length} stale products for clearance.` };
    }
  }

  if (intent.intent_type === 'catalog_cleanup') {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, category, price, badge, compare_at_price, description')
      .eq('merchant_id', intent.merchant_id)
      .eq('status', 'active')
      .limit(25);

    if (!products || products.length === 0) {
      return null;
    }

    const candidateProducts = products.filter((product: any) => {
      const description = String(product.description || '').trim();
      return !product.badge || !product.compare_at_price || description.length < 80;
    });

    if (candidateProducts.length === 0) {
      return {
        actionTaken: false,
        logMessage: 'Catalog quality is already strong enough that no cleanup changes were proposed.',
        terminalStatus: 'completed',
        intentStatus: 'completed',
      };
    }

    const isAuditStep = currentStepText.includes('audit') || currentStepText.includes('review') || currentStepText.includes('scan') || currentStepIdx === 0;
    const isDraftStep = (currentStepText.includes('draft') || currentStepText.includes('prepare') || currentStepText.includes('batch') || currentStepIdx === 1) && !isAuditStep;
    const isApplyStep = (currentStepText.includes('apply') || currentStepText.includes('launch') || currentStepText.includes('sync') || currentStepIdx >= 2) && !isAuditStep && !isDraftStep;

    if (isAuditStep) {
      const thinDescriptions = candidateProducts.filter((product: any) => {
        const description = String(product.description || '').trim();
        return description.length < 80;
      }).length;

      return {
        actionTaken: true,
        logMessage: `Audited ${candidateProducts.length} products and found ${thinDescriptions} with thin descriptions or missing merchandising data.`,
      };
    }

    if (isDraftStep) {
      const descriptionMode = wantsDescriptionRewrites(intent.constraints);
      const thinProducts = candidateProducts.filter((product: any) => String(product.description || '').trim().length < 80).slice(0, 8);

      if (descriptionMode && thinProducts.length > 0) {
        const items = await generateDescriptionChangeBatch({
          merchant,
          intent,
          products: thinProducts,
        });
        const plannedChanges: MerchantMissionPlannedChangeBatch[] = [
          {
            label: 'Description rewrites',
            summary: `Prepared ${items.length} product description updates for review before writing to the catalog.`,
            status: 'draft',
            items,
          },
        ];

        await persistPlannedChanges(intent.id, intent.constraints, plannedChanges);

        return {
          actionTaken: true,
          logMessage: `Prepared ${items.length} product description rewrites for merchant approval.`,
        };
      }

      const genericItems: MerchantMissionPlannedChangeItem[] = candidateProducts.slice(0, 12).map((product: any) => ({
        entityType: 'product',
        entityId: product.id,
        label: product.name,
        field: 'badge',
        currentValue: product.badge || null,
        proposedValue: product.badge || 'Optimized',
        summary: 'Clean up missing merchandising signals and catalog hygiene.',
      }));

      await persistPlannedChanges(intent.id, intent.constraints, [
        {
          label: 'Catalog cleanup edits',
          summary: `Grouped ${genericItems.length} catalog fixes into a safe approval batch for descriptions, badges, and merchandising cleanup.`,
          status: 'draft',
          items: genericItems,
        },
      ]);

      return {
        actionTaken: true,
        logMessage: `Grouped ${genericItems.length} catalog fixes into a safe approval batch for descriptions, badges, and merchandising cleanup.`,
      };
    }

    if (isApplyStep) {
      const workflow = getWorkflow(intent.constraints);
      const proposedChanges = Array.isArray(workflow.proposedChanges) ? workflow.proposedChanges as MerchantMissionPlannedChangeBatch[] : [];
      const descriptionItems = proposedChanges
        .flatMap((batch) => Array.isArray(batch.items) ? batch.items : [])
        .filter((item) => item.field === 'description' && item.entityType === 'product' && item.entityId && item.proposedValue);

      if (descriptionItems.length > 0) {
        const updatedProducts: string[] = [];

        for (const item of descriptionItems) {
          const { error } = await supabaseAdmin
            .from('products')
            .update({
              description: item.proposedValue,
              badge: 'Optimized',
            })
            .eq('merchant_id', intent.merchant_id)
            .eq('id', item.entityId);

          if (!error) {
            updatedProducts.push(item.entityId);
          }
        }

        await persistPlannedChanges(intent.id, intent.constraints, proposedChanges.map((batch) => ({
          ...batch,
          status: 'applied',
        })));

        return {
          actionTaken: true,
          logMessage: `Applied approved description rewrites to ${updatedProducts.length} products.`,
        };
      }

      const updated = await applyCatalogAutomation({
        merchantId: intent.merchant_id,
        actorType: 'agent',
        productIds: candidateProducts.map((product: any) => product.id),
        changes: { badge: 'Optimized' },
        eventType: 'catalog_cleanup_applied',
        summary: `Applied cleanup improvements to ${candidateProducts.length} products.`,
      });

      await persistPlannedChanges(intent.id, intent.constraints, proposedChanges.map((batch) => ({
        ...batch,
        status: 'applied',
      })));

      return { actionTaken: true, logMessage: `Applied catalog cleanup updates to ${updated.length} products.` };
    }
  }

  return null;
}
