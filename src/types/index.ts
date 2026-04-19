import type { StorefrontLink } from '@/lib/storefront/navigation'

export interface Merchant {
  shipping_settings: any
  id: string
  user_id: string
  store_name: string
  business_name?: string | null
  subdomain: string
  currency: string
  locale?: string
  email?: string
  phone?: string
  description?: string
  logo_url?: string | null
  custom_domain?: string | null
  domain_verified?: boolean
  stripe_account_id?: string | null
  stripe_customer_id?: string | null
  ai_provider?: string
  ai_api_key?: string | null
  ai_api_key_set?: boolean
  ai_model?: string | null
  auth_settings?: Record<string, unknown>
  ai_tone?: string | null
  ai_custom_instructions?: string | null
  ai_negotiation_style?: string | null
  ai_character_name?: string | null
  ai_character_persona?: string | null
  ai_character_avatar_url?: string | null
  ai_character_backstory?: string | null
  ai_refund_policy?: string
  ai_max_refund_amount?: number
  ai_loyalty_policy?: string
  ai_shipping_policy?: string
  ai_auto_negotiation_enabled?: boolean
  ai_mission_visibility_enabled?: boolean
  ai_max_discount_percentage?: number
  bargain_mode_enabled?: boolean
  bargain_ai_personality?: string | null
  ai_responses_enabled?: boolean
  conversation_logging_enabled?: boolean
  abandoned_cart_recovery_enabled?: boolean
  low_stock_alerts_enabled?: boolean
  low_stock_threshold?: number
  business_address?: string | null
  store_email?: string | null
  store_industry?: string | null
  order_notification_email?: string | null
  payment_methods?: Record<string, unknown>
  notification_settings?: Record<string, unknown>
  tax_settings?: Record<string, unknown>
  smtp_enabled?: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_password?: string
  smtp_from_email?: string
  smtp_from_name?: string
  branding_settings?: BrandingSettings
  google_search_console_id?: string | null
  bing_verification_id?: string | null
  mcp_api_key?: string | null
  shopify_config?: Record<string, unknown>
  woocommerce_config?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface BrandingSettings {
  primary_color?: string
  logo_url?: string | null
  logo_url_desktop?: string | null
  logo_width_mobile?: number
  logo_height_mobile?: number
  logo_width_desktop?: number
  logo_height_desktop?: number
  logo_size?: number
  welcome_message?: string
  hero_title?: string
  hero_subtitle?: string
  template_id?: string
  loader_style?: 'spinner' | 'dots' | 'pulse' | 'bars' | 'logo'
  enable_chat?: boolean
  ai_character_subtitle?: string
  exclude_bargained_from_discounts?: boolean
  sections?: Record<string, unknown>[]
  banners?: Record<string, unknown>[]
  socials?: Record<string, unknown>
  navigation_links?: StorefrontLink[]
  footer_links?: StorefrontLink[]
  footer_description?: string
  footer_note?: string
  announcement_text?: string
  seo?: {
    meta_title?: string
    meta_description?: string
    keywords?: string
    og_image?: string
    favicon_url?: string
  }
}

export interface Product {
  id: string
  merchant_id: string
  name: string
  description?: string
  price: number
  compare_at_price?: number | null
  stock_quantity: number
  category?: string
  category_id?: string | null
  image_url?: string | null
  images?: string[]
  is_active?: boolean
  sku?: string | null
  weight?: number | null
  created_at?: string
  updated_at?: string
  badge?: string | null
  bargain_enabled?: boolean
  bargain_min_price?: number | null
  track_quantity?: boolean
  type?: string | null
  variants?: ProductVariant[]
  ai_reason?: string
  ai_tradeoff?: string
  ai_highlights?: string[]
  rating?: number | null
  review_count?: number
  review_summary?: string | null
  popularity_reason?: string | null
  is_veg?: boolean
  original_price?: number
}

export interface Category {
  id: string
  merchant_id: string
  name: string
  description?: string
  image_url?: string | null
  position?: number
  created_at?: string
}

export interface CartItem extends Product {
  quantity: number
  bargainedPrice?: number
  originalPrice?: number
  variant?: {
    id?: string
    name?: string
  }
  variantName?: string
}

export interface Discount {
  id: string
  merchant_id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  min_order_amount?: number
  max_uses?: number
  usage_limit?: number
  used_count?: number
  is_active?: boolean
  starts_at?: string
  expires_at?: string
  ends_at?: string
  created_at?: string
  description?: string
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'system'
  text: string
  metadata?: {
    products?: Product[]
    suggestionButtons?: (string | { label: string; action: string })[]
    showCartButtons?: boolean
    requiresIdentification?: boolean
    checkoutConfidence?: CheckoutConfidence
    comparison?: ProductComparison
    activePreferences?: PreferenceSummary[]
    refinementOptions?: RefinementOption[]
    activeFilters?: ActiveFilter[]
    variantPrompt?: VariantPrompt
    recoveryState?: RecoveryState
    lastStableResultId?: string
    cartActions?: Array<{ type: string; [key: string]: unknown }>
    layout?: Record<string, unknown>
    intents?: Array<Record<string, unknown>>
    plans?: Array<Record<string, unknown>>
    coupon?: Record<string, unknown> | null
    bargain?: Record<string, unknown> | null
    consumerEmail?: string | null
  }
}

export interface CheckoutConfidence {
  subtotal: number
  estimatedShipping: number
  estimatedTax: number
  estimatedTotal: number
  paymentMethods: string[]
  returnSummary: string
  assumptions: string[]
  bargainSavings?: number
  couponImpact?: number
  currency?: string
}

export interface ComparisonProductSummary {
  id: string
  name: string
  price: number
  compare_at_price?: number | null
  stock_status?: string
  variant_count?: number
  rating?: number | null
  review_count?: number
  review_summary?: string | null
  popularity_reason?: string | null
  ai_reason?: string
  ai_tradeoff?: string
}

export interface ProductComparison {
  products: ComparisonProductSummary[]
  verdict: string
  bestFor: string[]
  tradeoffs: string[]
}

export interface PreferenceSummary {
  key: string
  label: string
  value: string
  source: 'session' | 'store' | 'platform'
}

export interface RefinementOption {
  label: string
  action: string
  type?: 'budget' | 'size' | 'color' | 'urgency' | 'deal' | 'stock' | 'category'
}

export interface ActiveFilter {
  key: string
  label: string
  value: string
}

export interface MerchantContext {
  merchant: Merchant
  merchantId: string
  isOwner: boolean
  permissions: string[]
}

export interface MerchantListPage<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface MerchantDashboardStats {
  revenue: number
  orders: number
  conversations: number
  conversionRate: number
}

export interface MerchantDashboardTrendSet {
  revenue: number
  orders: number
  conversations: number
  conversionRate: number
}

export interface MerchantDashboardChartPoint {
  name: string
  sales: number
}

export interface MerchantDashboardTask {
  id: string
  title: string
  description: string
  href: string
  completed: boolean
}

export interface MerchantDashboardSummary {
  stats: MerchantDashboardStats
  trends: MerchantDashboardTrendSet
  chartData: MerchantDashboardChartPoint[]
  recentConversations: Array<Record<string, unknown>>
  recentOrders: Array<Record<string, unknown>>
  aiMetrics: Record<string, unknown> | null
  productCount: number
  lowStockCount: number
  setupTasks: MerchantDashboardTask[]
}

export interface VariantPrompt {
  productId: string
  productName: string
  options: Array<{ id: string; label: string; price?: number | null }>
}

export interface RecoveryState {
  type: 'retry' | 'browse' | 'callback' | 'resume_results' | 'resume_checkout'
  message: string
  actions: Array<string | { label: string; action: string }>
}

export interface AppliedCoupon {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  excludeBargainedItems?: boolean
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  position: number
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price?: number
  stock_quantity?: number
  is_active: boolean
  options?: Record<string, string>
}

export interface ProductReview {
  id: string
  product_id: string
  rating: number
  comment?: string
  author_name?: string
  is_approved: boolean
  created_at: string
}

export type AgenticGoalType =
  | 'increase_aov'
  | 'reduce_low_stock'
  | 'recover_abandoned_carts'
  | 'clear_dead_inventory'
  | 'improve_first_time_conversion'
  | 'catalog_cleanup'
  | 'customer_winback'
  | 'support_triage'

export type MerchantMissionPhase =
  | 'briefing'
  | 'awaiting_plan_approval'
  | 'queued'
  | 'executing'
  | 'awaiting_action_batch'
  | 'paused'
  | 'blocked'
  | 'completed'
  | 'cancelled'

export type MerchantMissionApprovalKind = 'plan' | 'write_batch'

export type MissionPlanFeasibility = 'executable' | 'partially_executable' | 'analysis_only'

export interface MissionCapabilityStatus {
  capabilityId: string
  label: string
  status: 'available' | 'requires_approval' | 'unsupported'
  reason?: string | null
}

export interface MissionActionInvocation {
  id: string
  actionId: string
  title: string
  reasoning?: string | null
  readOnly: boolean
  approvalRequired: boolean
  riskLevel?: 'low' | 'medium' | 'high'
  input: Record<string, unknown>
}

export interface MissionActionPreview {
  actionInvocationId: string
  title: string
  resourceType: string
  operation: string
  summary: string
  riskSummary?: string | null
  affectedCount?: number | null
  before?: Array<Record<string, unknown>>
  after?: Array<Record<string, unknown>>
  sideEffects?: string[]
}

export interface ApprovedMissionBatch {
  id: string
  stepId: string
  title: string
  status: 'pending' | 'approved' | 'rejected' | 'executed'
  action: MissionActionInvocation
  preview: MissionActionPreview
  approvedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  executedAt?: string | null
}

export interface MissionExecutionLease {
  status: 'idle' | 'leased'
  leaseId?: string | null
  leasedAt?: string | null
}

export interface MissionPlanStep {
  id: string
  title: string
  reasoning?: string | null
  kind: 'analysis' | 'action'
  actionId?: string | null
  approvalRequired: boolean
  expectedOutput?: string | null
}

export interface MissionPlanDocument {
  planVersion: 2
  requestedTask: string
  interpretedObjective: string
  executionStrategy: string
  feasibility: MissionPlanFeasibility
  requiredCapabilities: MissionCapabilityStatus[]
  blockingCapabilities: string[]
  steps: MissionPlanStep[]
  actions: MissionActionInvocation[]
  approvals: ApprovedMissionBatch[]
  results?: Array<{
    stepId: string
    actionInvocationId?: string | null
    summary: string
    createdAt: string
  }>
}

export interface MerchantMissionBrief {
  originalPrompt: string
  objective: string
  requestedTask?: string
  interpretedObjective?: string
  executionStrategy?: string
  feasibility?: MissionPlanFeasibility
  requiredCapabilities?: MissionCapabilityStatus[]
  blockingCapabilities?: string[]
  planVersion?: 1 | 2
  clarifiedIntent?: string
  assumptions?: string[]
  successMetrics?: string[]
  interpretedType: AgenticGoalType
  interpretedScope: MerchantMissionSummary['scope']
  interpretationConfidence?: number
  executionMode?: 'actionable' | 'analysis_only'
  interpretationWarnings?: string[]
  merchantFacingTitle: string
  planSummary: string
  planSteps?: string[]
  approvalStrategy: {
    initialPlan: 'required'
    writeBatches: 'required'
  }
  likelyOutputs: string[]
  actionBatches: string[]
}

export interface MerchantMissionSummary {
  id: string
  planId: string | null
  title: string
  goal: string
  consumerEmail: string | null
  missionType: AgenticGoalType | string
  status: 'planning' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'failed_retryable' | 'blocked' | 'cancelled'
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected'
  confidence: number
  scope: 'catalog' | 'orders' | 'customers' | 'marketing' | 'support' | 'intelligence' | 'operations'
  steps: string[]
  currentStep?: number | null
  attemptCount?: number | null
  nextRetryAt?: string | null
  lastError?: string | null
  progressLabel: string
  createdAt: string
  updatedAt: string
  roiSummary?: string | null
  blockingReason?: string | null
  missionPhase?: MerchantMissionPhase
  approvalKind?: MerchantMissionApprovalKind | null
  nextAction?: string | null
  resultSummary?: string | null
  brief?: MerchantMissionBrief | null
  planVersion?: 1 | 2
  feasibility?: MissionPlanFeasibility
  approvalSummary?: string | null
}

export interface MerchantMissionStep {
  index: number
  label: string
  status: 'completed' | 'current' | 'pending' | 'blocked'
  log?: string | null
  loggedAt?: string | null
}

export interface MerchantMissionLogEntry {
  id: string
  actionType: string
  description: string
  status: 'success' | 'waiting' | 'failed' | 'completed' | 'cancelled' | string
  createdAt: string
}

export interface MerchantMissionPlannedChangeItem {
  entityType: 'product' | 'campaign' | 'discount' | 'customer' | 'support_case' | string
  entityId: string
  label: string
  field: string
  currentValue?: string | null
  proposedValue?: string | null
  summary?: string | null
}

export interface MerchantMissionPlannedChangeBatch {
  label: string
  summary: string
  status?: 'draft' | 'approved' | 'applied' | 'rejected'
  items: MerchantMissionPlannedChangeItem[]
}

export interface MerchantMissionThreadItem {
  id: string
  kind: 'merchant_request' | 'agent_plan' | 'approval_request' | 'execution_update' | 'result' | 'blocker'
  title: string
  body: string
  createdAt?: string | null
  status?: string | null
  meta?: {
    badge?: string | null
    stepLabel?: string | null
  } | null
  plannedBatch?: MerchantMissionPlannedChangeBatch | null
}

export interface MerchantMissionDetail extends MerchantMissionSummary {
  currentStep: number
  completionRatio: number
  logs: MerchantMissionLogEntry[]
  stepProgress: MerchantMissionStep[]
  constraints?: Record<string, unknown> | null
  affectedEntities?: Array<{ type: string; id: string; label?: string | null }>
  plannedChanges?: MerchantMissionPlannedChangeBatch[]
  threadItems?: MerchantMissionThreadItem[]
  planDocument?: MissionPlanDocument | null
}

export interface MerchantApprovalItem {
  id: string
  kind: 'mission' | 'decision'
  domain: 'mission' | 'refunds' | 'loyalty' | 'pricing' | 'shipping' | 'campaigns' | 'catalog' | 'support' | 'orders' | 'update'
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'reversed'
  title: string
  summary: string
  createdAt: string
  consumerEmail: string | null
  policySummary?: string | null
  missionId?: string | null
  planId?: string | null
  decisionLogId?: string | null
  decisionType?: string | null
  approvalKind?: MerchantMissionApprovalKind | null
}

export type MerchantAgentThreadKind = 'main' | 'task'

export type MerchantAgentThreadStatus =
  | 'active'
  | 'waiting'
  | 'needs_approval'
  | 'completed'
  | 'archived'

export type MerchantAgentMessageRole = 'user' | 'assistant' | 'tool' | 'system'

export type MerchantAgentMessageType =
  | 'chat'
  | 'clarification'
  | 'handoff'
  | 'plan'
  | 'approval_request'
  | 'approval_result'
  | 'execution_update'
  | 'result'
  | 'error'

export interface MerchantAgentMessageAction {
  id: string
  label: string
  kind: 'send_prompt' | 'approve' | 'reject' | 'open_thread' | 'open_mission' | 'navigate'
  payload?: Record<string, unknown> | null
}

export interface MerchantAgentPendingApproval {
  planId: string
  kind: MerchantMissionApprovalKind
  title: string
  summary: string
}

export interface MerchantAgentMessage {
  id: string
  role: MerchantAgentMessageRole
  messageType: MerchantAgentMessageType
  content: string
  createdAt: string
  status?: string | null
  actions?: MerchantAgentMessageAction[]
  metadata?: Record<string, unknown> | null
}

export interface MerchantAgentThreadSummary {
  id: string
  kind: MerchantAgentThreadKind
  title: string
  status: MerchantAgentThreadStatus
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  lastMessagePreview?: string | null
  parentThreadId?: string | null
  linkedMissionId?: string | null
  linkedPlanId?: string | null
  currentTaskState?: string | null
  pendingApproval?: MerchantAgentPendingApproval | null
  metadata?: Record<string, unknown> | null
}

export interface MerchantAgentThreadDetail extends MerchantAgentThreadSummary {
  messages: MerchantAgentMessage[]
  linkedMission?: MerchantMissionDetail | null
}

export interface MerchantAgentEvent {
  id: string
  type: string
  title: string
  summary: string
  createdAt: string
  actor: 'user' | 'agent' | 'system' | 'webhook'
}

export interface MerchantSuggestedAction {
  id: string
  title: string
  description: string
  goalType: AgenticGoalType
  scope: MerchantMissionSummary['scope']
  impactLabel: string
}

export interface AgenticTriggerRule {
  enabled: boolean
  cooldownHours: number
  minCount: number
}

export interface AgenticTriggerSettings {
  abandonedCartRecovery: AgenticTriggerRule
  lowStockRisk: AgenticTriggerRule
  deadInventoryCleanup: AgenticTriggerRule
}
