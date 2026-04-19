import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { applyCatalogAutomation } from '@/lib/domain/catalog';
import { createEmailCampaignDraft } from '@/lib/domain/campaigns';
import { createMerchantDiscount } from '@/lib/domain/discounts';
import { createSupportCase } from '@/lib/domain/support';
import type {
  Merchant,
  MissionActionInvocation,
  MissionActionPreview,
  MissionCapabilityStatus,
} from '@/types';

const productSelectionSchema = z.object({
  allActive: z.boolean().optional(),
  productIds: z.array(z.string()).optional(),
  category: z.string().optional(),
  nameContains: z.string().optional(),
}).default({});

const inspectProductsInputSchema = z.object({
  selection: productSelectionSchema.default({ allActive: true }),
  limit: z.number().int().min(1).max(100).optional(),
});

const bulkInventoryInputSchema = z.object({
  selection: productSelectionSchema.default({ allActive: true }),
  stockQuantity: z.number().int().min(0),
});

const bulkBadgeInputSchema = z.object({
  selection: productSelectionSchema.default({ allActive: true }),
  badge: z.string().min(1).max(80),
});

const createDiscountInputSchema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minOrderAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().optional().nullable(),
  endsAt: z.string().optional().nullable(),
});

const createCampaignDraftInputSchema = z.object({
  name: z.string().min(2).max(120),
  subject: z.string().min(2).max(200),
  headline: z.string().min(2).max(200),
  bodyText: z.string().min(2),
  ctaText: z.string().min(2).max(80),
  segmentId: z.string().optional().nullable(),
  scheduleAt: z.string().optional().nullable(),
});

const createSupportCaseInputSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().nullable(),
  message: z.string().min(1),
  preferredTime: z.string().optional().nullable(),
});

type ActionDefinition = {
  id: string
  title: string
  description: string
  readOnly: boolean
  approvalRequired: boolean
  riskLevel: 'low' | 'medium' | 'high'
  schema: z.ZodTypeAny
}

const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    id: 'inspect_products',
    title: 'Inspect products',
    description: 'Read matching products and summarize catalog facts.',
    readOnly: true,
    approvalRequired: false,
    riskLevel: 'low',
    schema: inspectProductsInputSchema,
  },
  {
    id: 'bulk_update_inventory',
    title: 'Update inventory quantities',
    description: 'Set stock quantity for matching active products.',
    readOnly: false,
    approvalRequired: true,
    riskLevel: 'high',
    schema: bulkInventoryInputSchema,
  },
  {
    id: 'bulk_update_badge',
    title: 'Update product badges',
    description: 'Set badge text for matching active products.',
    readOnly: false,
    approvalRequired: true,
    riskLevel: 'medium',
    schema: bulkBadgeInputSchema,
  },
  {
    id: 'create_discount',
    title: 'Create discount',
    description: 'Create a merchant discount code.',
    readOnly: false,
    approvalRequired: true,
    riskLevel: 'medium',
    schema: createDiscountInputSchema,
  },
  {
    id: 'create_email_campaign_draft',
    title: 'Create email campaign draft',
    description: 'Create a draft email campaign for the merchant.',
    readOnly: false,
    approvalRequired: true,
    riskLevel: 'medium',
    schema: createCampaignDraftInputSchema,
  },
  {
    id: 'create_support_case',
    title: 'Create support case',
    description: 'Open a support case in the merchant queue.',
    readOnly: false,
    approvalRequired: true,
    riskLevel: 'low',
    schema: createSupportCaseInputSchema,
  },
];

export function listMissionActionDefinitions() {
  return ACTION_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    readOnly: definition.readOnly,
    approvalRequired: definition.approvalRequired,
    riskLevel: definition.riskLevel,
  }));
}

function getDefinition(actionId: string) {
  return ACTION_DEFINITIONS.find((definition) => definition.id === actionId) || null;
}

async function resolveProducts(merchantId: string, selection: z.infer<typeof productSelectionSchema>, limit = 50) {
  let query = supabaseAdmin
    .from('products')
    .select('id, name, category, stock_quantity, badge, price, compare_at_price, status')
    .eq('merchant_id', merchantId)
    .eq('status', 'active')
    .limit(limit);

  if (selection.productIds && selection.productIds.length > 0) {
    query = query.in('id', selection.productIds);
  }

  if (selection.category) {
    query = query.eq('category', selection.category);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const products = (data || []).filter((product) => {
    if (selection.nameContains) {
      return String(product.name || '').toLowerCase().includes(selection.nameContains.toLowerCase());
    }
    return true;
  });

  return products;
}

function previewRows(products: any[], mapAfter: (product: any) => Record<string, unknown>) {
  return products.slice(0, 10).map((product) => ({
    id: product.id,
    name: product.name,
    ...mapAfter(product),
  }));
}

export function listMissionCapabilities(): MissionCapabilityStatus[] {
  return ACTION_DEFINITIONS.map((definition) => ({
    capabilityId: definition.id,
    label: definition.title,
    status: definition.approvalRequired ? 'requires_approval' : 'available',
  }));
}

export function validateMissionActionInvocation(action: MissionActionInvocation) {
  const definition = getDefinition(action.actionId);
  if (!definition) {
    throw new Error(`Unsupported mission action: ${action.actionId}`);
  }

  const input = definition.schema.parse(action.input) as Record<string, unknown>;
  return {
    ...action,
    title: action.title || definition.title,
    readOnly: definition.readOnly,
    approvalRequired: definition.approvalRequired,
    riskLevel: action.riskLevel || definition.riskLevel,
    input,
  } satisfies MissionActionInvocation;
}

export async function previewMissionAction(merchant: Merchant, action: MissionActionInvocation): Promise<MissionActionPreview> {
  const validated = validateMissionActionInvocation(action);

  if (validated.actionId === 'inspect_products') {
    const input = inspectProductsInputSchema.parse(validated.input);
    const products = await resolveProducts(merchant.id, input.selection, input.limit || 25);
    return {
      actionInvocationId: validated.id,
      title: validated.title,
      resourceType: 'product',
      operation: 'inspect',
      summary: `Inspect ${products.length} matching active products.`,
      affectedCount: products.length,
      before: previewRows(products, (product) => ({
        stock_quantity: product.stock_quantity,
        badge: product.badge,
        price: product.price,
      })),
      after: [],
      sideEffects: [],
    };
  }

  if (validated.actionId === 'bulk_update_inventory') {
    const input = bulkInventoryInputSchema.parse(validated.input);
    const products = await resolveProducts(merchant.id, input.selection);
    return {
      actionInvocationId: validated.id,
      title: validated.title,
      resourceType: 'product',
      operation: 'update_inventory',
      summary: `Set stock quantity to ${input.stockQuantity} for ${products.length} matching active products.`,
      affectedCount: products.length,
      riskSummary: 'Inventory counts affect storefront availability and purchasing behavior.',
      before: previewRows(products, (product) => ({ stock_quantity: product.stock_quantity })),
      after: previewRows(products, () => ({ stock_quantity: input.stockQuantity })),
      sideEffects: ['Storefront availability may change immediately.'],
    };
  }

  if (validated.actionId === 'bulk_update_badge') {
    const input = bulkBadgeInputSchema.parse(validated.input);
    const products = await resolveProducts(merchant.id, input.selection);
    return {
      actionInvocationId: validated.id,
      title: validated.title,
      resourceType: 'product',
      operation: 'update_badge',
      summary: `Set badge "${input.badge}" on ${products.length} matching active products.`,
      affectedCount: products.length,
      riskSummary: 'Product presentation will change on the storefront.',
      before: previewRows(products, (product) => ({ badge: product.badge })),
      after: previewRows(products, () => ({ badge: input.badge })),
      sideEffects: ['Storefront merchandising labels may change immediately.'],
    };
  }

  if (validated.actionId === 'create_discount') {
    const input = createDiscountInputSchema.parse(validated.input);
    return {
      actionInvocationId: validated.id,
      title: validated.title,
      resourceType: 'discount',
      operation: 'create',
      summary: `Create discount ${input.code.toUpperCase()} with ${input.type} value ${input.value}.`,
      affectedCount: 1,
      riskSummary: 'Discounts can affect revenue and promotion performance.',
      before: [],
      after: [{
        code: input.code.toUpperCase(),
        type: input.type,
        value: input.value,
        min_order_amount: input.minOrderAmount || 0,
      }],
      sideEffects: ['The discount may become available to staff or customers after activation.'],
    };
  }

  if (validated.actionId === 'create_email_campaign_draft') {
    const input = createCampaignDraftInputSchema.parse(validated.input);
    return {
      actionInvocationId: validated.id,
      title: validated.title,
      resourceType: 'marketing_campaign',
      operation: 'create_draft',
      summary: `Create email campaign draft "${input.name}".`,
      affectedCount: 1,
      riskSummary: 'Draft creation is low risk, but later launch can affect customers.',
      before: [],
      after: [{
        name: input.name,
        subject: input.subject,
        segment_id: input.segmentId || null,
      }],
      sideEffects: ['A new draft campaign will appear in merchant marketing tools.'],
    };
  }

  const input = createSupportCaseInputSchema.parse(validated.input);
  return {
    actionInvocationId: validated.id,
    title: validated.title,
    resourceType: 'support_case',
    operation: 'create',
    summary: `Create support case for ${input.name}.`,
    affectedCount: 1,
    riskSummary: 'A new support case will be added to the merchant queue.',
    before: [],
    after: [{
      name: input.name,
      email: input.email || null,
      message: input.message,
    }],
    sideEffects: ['Merchant support team will see the new case.'],
  };
}

export async function executeMissionAction(merchant: Merchant, action: MissionActionInvocation) {
  const validated = validateMissionActionInvocation(action);

  if (validated.actionId === 'inspect_products') {
    const input = inspectProductsInputSchema.parse(validated.input);
    const products = await resolveProducts(merchant.id, input.selection, input.limit || 25);
    return {
      summary: `Inspected ${products.length} matching active products.`,
      output: products,
    };
  }

  if (validated.actionId === 'bulk_update_inventory') {
    const input = bulkInventoryInputSchema.parse(validated.input);
    const products = await resolveProducts(merchant.id, input.selection);
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ stock_quantity: input.stockQuantity })
      .eq('merchant_id', merchant.id)
      .in('id', products.map((product) => product.id))
      .select('id, name, stock_quantity');

    if (error) {
      throw error;
    }

    return {
      summary: `Updated stock quantity to ${input.stockQuantity} for ${data?.length || 0} products.`,
      output: data || [],
    };
  }

  if (validated.actionId === 'bulk_update_badge') {
    const input = bulkBadgeInputSchema.parse(validated.input);
    const products = await resolveProducts(merchant.id, input.selection);
    const updated = await applyCatalogAutomation({
      merchantId: merchant.id,
      actorType: 'agent',
      productIds: products.map((product) => product.id),
      changes: { badge: input.badge },
      eventType: 'catalog_badges_updated',
      summary: `Updated badges for ${products.length} products.`,
    });

    return {
      summary: `Updated badges for ${updated.length} products.`,
      output: updated,
    };
  }

  if (validated.actionId === 'create_discount') {
    const input = createDiscountInputSchema.parse(validated.input);
    const discount = await createMerchantDiscount({
      merchantId: merchant.id,
      actorType: 'agent',
      code: input.code,
      type: input.type,
      value: input.value,
      minOrderAmount: input.minOrderAmount,
      usageLimit: input.usageLimit ?? null,
      endsAt: input.endsAt || null,
      context: { missionActionId: validated.id },
    });

    return {
      summary: `Created discount ${discount.code}.`,
      output: discount,
    };
  }

  if (validated.actionId === 'create_email_campaign_draft') {
    const input = createCampaignDraftInputSchema.parse(validated.input);
    const campaign = await createEmailCampaignDraft({
      merchantId: merchant.id,
      actorType: 'agent',
      name: input.name,
      segmentId: input.segmentId || null,
      scheduleAt: input.scheduleAt || null,
      content: {
        subject: input.subject,
        headline: input.headline,
        bodyText: input.bodyText,
        ctaText: input.ctaText,
      },
      context: { missionActionId: validated.id },
    });

    return {
      summary: `Created email campaign draft ${campaign.name}.`,
      output: campaign,
    };
  }

  const input = createSupportCaseInputSchema.parse(validated.input);
  const supportCase = await createSupportCase({
    merchantId: merchant.id,
    actorType: 'agent',
    name: input.name,
    email: input.email || null,
    message: input.message,
    preferredTime: input.preferredTime || null,
    context: { missionActionId: validated.id },
  });

  return {
    summary: `Created support case for ${input.name}.`,
    output: supportCase,
  };
}
