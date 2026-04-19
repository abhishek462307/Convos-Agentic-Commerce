import type { AgenticGoalType, MerchantSuggestedAction, MerchantMissionSummary, MerchantMissionBrief } from '@/types';

interface MissionBlueprint {
  title: string
  goal: string
  scope: MerchantMissionSummary['scope']
  intentType: AgenticGoalType
  steps: string[]
  progressLabel: string
  roiSummary: string
  requiresApproval: boolean
}

interface MissionGoalInference {
  goalType: AgenticGoalType
  confidence: number
  warnings: string[]
  matchedSignals: string[]
}

function toTaskTitle(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, ' ').replace(/[.?!]+$/g, '');
  if (!normalized) {
    return 'Custom merchant mission';
  }

  const sentence = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return sentence.length <= 72 ? sentence : `${sentence.slice(0, 69).trimEnd()}...`;
}

const PROMPT_CLASSIFIER_RULES: Array<{
  goalType: AgenticGoalType
  keywords: string[]
}> = [
  {
    goalType: 'recover_abandoned_carts',
    keywords: ['abandoned cart', 'cart recovery', 'recover cart', 'checkout drop', 'stalled checkout'],
  },
  {
    goalType: 'reduce_low_stock',
    keywords: ['low stock', 'stock risk', 'out of stock', 'restock', 'inventory risk'],
  },
  {
    goalType: 'clear_dead_inventory',
    keywords: ['dead inventory', 'slow moving', 'stale inventory', 'not selling', 'clear inventory', 'move stock'],
  },
  {
    goalType: 'catalog_cleanup',
    keywords: ['optimize product', 'improve product', 'product is not selling', 'sell this better', 'product page', 'listing', 'description', 'descriptions', 'copy', 'rewrite', 'images', 'merchandising', 'weak sku'],
  },
  {
    goalType: 'customer_winback',
    keywords: ['win back', 'lapsed customer', 'churn', 'inactive customer', 'bring back'],
  },
  {
    goalType: 'support_triage',
    keywords: ['support', 'backlog', 'triage', 'tickets', 'complaints', 'help desk'],
  },
  {
    goalType: 'improve_first_time_conversion',
    keywords: ['first time', 'new shopper', 'conversion', 'trust', 'landing page'],
  },
];

function detectPromptSignals(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  const hasActionVerb = /(rewrite|reword|improve|optimi[sz]e|fix|clean up|cleanup|audit|review|find|identify|launch|create|send|prepare|draft|analy[sz]e|reprice|tag|segment|recover|win back|triage|restock|refresh|update)/.test(normalized);
  const hasConcreteTarget = /(product|sku|catalog|inventory|stock|customer|campaign|email|whatsapp|checkout|cart|support|ticket|discount|offer|bundle|price|pricing|landing page|conversion|shopper|order|refund|shipping)/.test(normalized);
  const looksSpecificTask = hasActionVerb
    && hasConcreteTarget
    && normalized.split(/\s+/).length >= 4
    && !/(somehow|something|anything|stuff|whatever|just better|improve the store|help me improve)/.test(normalized);
  const wantsInventoryLevelChange =
    /(increase|decrease|set|change|update|make|raise|lower).*(stock|inventory).*(to\s+\d+|\d+\s*(units|pcs|pieces)?)/.test(normalized)
    || /(stock|inventory).*(to\s+\d+|\d+\s*(units|pcs|pieces)?)/.test(normalized);

  return {
    normalized,
    wantsDescriptions: /(description|descriptions|product copy|rewrite|reword|copywriting|content)/.test(normalized),
    wantsProductPageWork: /(product page|listing|merchandising|catalog|sku|product)/.test(normalized),
    wantsInventoryWork: /(inventory|stock|restock|out of stock|low stock)/.test(normalized),
    wantsPricingWork: /(price|pricing|markdown|markdowns|reprice|margin)/.test(normalized),
    wantsCampaignWork: /(campaign|email|sms|whatsapp|broadcast|automation|flow|segment)/.test(normalized),
    wantsDiscountsOrOffers: /(discount|offer|promotion|coupon|bundle|upsell|cross-sell|aov|average order value)/.test(normalized),
    wantsRecovery: /(abandoned cart|cart recovery|recover cart|checkout drop|stalled checkout)/.test(normalized),
    wantsWinback: /(win back|lapsed customer|churn|inactive customer|bring back|retention)/.test(normalized),
    wantsSupport: /(support|backlog|triage|tickets|complaints|help desk|refund|return|shipping delay|fulfillment|order issue)/.test(normalized),
    mentionsWordCount: /(\d+\s*word|\d+\s*words)/.test(normalized),
    hasActionVerb,
    hasConcreteTarget,
    looksSpecificTask,
    wantsInventoryLevelChange,
  };
}

function derivePromptSpecificCopy(
  prompt: string,
  goalType: AgenticGoalType,
  scope: MerchantMissionSummary['scope']
) {
  const signals = detectPromptSignals(prompt);

  if (goalType === 'catalog_cleanup' && signals.wantsDescriptions) {
    return {
      merchantFacingTitle: 'Rewrite product descriptions',
      planSummary: 'The mission will audit weak or missing product copy, group safe description rewrites by catalog priority, then prepare approval-ready content updates for each product.',
      likelyOutputs: [
        signals.mentionsWordCount ? 'Long-form product description rewrite plan' : 'Product description rewrite plan',
        'Unique copy recommendations by product',
        'Approval-ready description update batch',
      ],
      actionBatches: ['Description rewrites', 'Merchandising copy changes', 'Product page content rollout'],
    };
  }

  if (goalType === 'catalog_cleanup' && signals.wantsProductPageWork) {
    return {
      merchantFacingTitle: 'Improve product page quality',
      planSummary: 'The mission will audit weak product pages, identify missing merchandising signals, then prepare approval-ready content and catalog fixes to improve sell-through.',
      likelyOutputs: [
        'Product page optimization plan',
        'Catalog content and merchandising recommendations',
        'Approval-ready product page change batch',
      ],
      actionBatches: ['Content edits', 'Merchandising changes', 'Product page rollout'],
    };
  }

  if (goalType === 'increase_aov' && signals.wantsDiscountsOrOffers) {
    return {
      merchantFacingTitle: 'Increase average order value',
      planSummary: 'The mission will identify high-intent products and bundle opportunities, prepare offer and cross-sell recommendations, then queue approval-ready launch actions to lift basket size.',
      likelyOutputs: [
        'Revenue opportunity diagnosis',
        'Bundle and offer recommendations',
        'Approval-ready upsell launch batch',
      ],
      actionBatches: ['Audience selection', 'Offer setup', 'Campaign launch'],
    };
  }

  if (goalType === 'recover_abandoned_carts' && signals.wantsRecovery) {
    return {
      merchantFacingTitle: 'Recover abandoned carts',
      planSummary: 'The mission will identify stalled checkouts, choose the best re-engagement channel, then prepare approval-ready follow-up actions to recover revenue.',
      likelyOutputs: [
        'Recovery audience selection',
        'Channel and message recommendations',
        'Approval-ready recovery launch batch',
      ],
      actionBatches: ['Audience selection', 'Message setup', 'Recovery launch'],
    };
  }

  if (goalType === 'customer_winback' && signals.wantsWinback) {
    return {
      merchantFacingTitle: 'Win back lapsed customers',
      planSummary: 'The mission will identify lapsed customer segments, prepare targeted reactivation offers and messaging, then queue approval-ready winback actions.',
      likelyOutputs: [
        'Lapsed segment diagnosis',
        'Offer and message recommendations',
        'Approval-ready winback batch',
      ],
      actionBatches: ['Segment confirmation', 'Offer/message rollout', 'Follow-up sequence'],
    };
  }

  if (goalType === 'support_triage' && signals.wantsSupport) {
    return {
      merchantFacingTitle: 'Triage support backlog',
      planSummary: 'The mission will classify urgent issues, group safe responses, then prepare escalation-ready batches for merchant approval.',
      likelyOutputs: [
        'Support priority matrix',
        'Escalation and response recommendations',
        'Approval-ready resolution batches',
      ],
      actionBatches: ['Priority routing', 'Safe automated responses', 'Escalation batch'],
    };
  }

  return {
    merchantFacingTitle: toTaskTitle(prompt),
    planSummary: `The mission will ${createMissionBlueprint(goalType, prompt.trim()).steps.map((step) => step.charAt(0).toLowerCase() + step.slice(1)).join(', then ')}.`,
    likelyOutputs: getLikelyOutputs(goalType, scope),
    actionBatches: getActionBatches(goalType, scope),
  };
}

export const MISSION_TEMPLATE_OPTIONS: MerchantSuggestedAction[] = [
  {
    id: 'increase-aov',
    title: 'Increase AOV This Week',
    description: 'Create a bundled upsell mission for high-intent shoppers and low-friction products.',
    goalType: 'increase_aov',
    scope: 'marketing',
    impactLabel: 'Revenue lift',
  },
  {
    id: 'reduce-low-stock',
    title: 'Reduce Low-Stock Risk',
    description: 'Identify fragile SKUs and queue replenishment, merchandising, or substitution actions.',
    goalType: 'reduce_low_stock',
    scope: 'catalog',
    impactLabel: 'Inventory protection',
  },
  {
    id: 'recover-carts',
    title: 'Recover Abandoned Carts',
    description: 'Launch a retention mission for stalled shoppers using the best-fit follow-up channel.',
    goalType: 'recover_abandoned_carts',
    scope: 'marketing',
    impactLabel: 'Recovered revenue',
  },
  {
    id: 'clear-inventory',
    title: 'Clear Dead Inventory',
    description: 'Find stale products and prepare bundle, badge, discount, and campaign actions.',
    goalType: 'clear_dead_inventory',
    scope: 'catalog',
    impactLabel: 'Catalog cleanup',
  },
  {
    id: 'first-time-conversion',
    title: 'Improve First-Time Conversion',
    description: 'Create a new-shopper mission with social proof, trust cues, and onboarding offers.',
    goalType: 'improve_first_time_conversion',
    scope: 'customers',
    impactLabel: 'Conversion lift',
  },
  {
    id: 'catalog-cleanup',
    title: 'Clean Up Catalog Quality',
    description: 'Fix thin product data, merchandising gaps, and storefront hygiene issues.',
    goalType: 'catalog_cleanup',
    scope: 'catalog',
    impactLabel: 'Catalog quality',
  },
  {
    id: 'customer-winback',
    title: 'Win Back Lapsed Customers',
    description: 'Build a recovery mission for churn-risk customers with targeted offers and follow-up.',
    goalType: 'customer_winback',
    scope: 'customers',
    impactLabel: 'Retention',
  },
  {
    id: 'support-triage',
    title: 'Triage Support Backlog',
    description: 'Classify urgent cases, send safe acknowledgments, and escalate blocked issues.',
    goalType: 'support_triage',
    scope: 'support',
    impactLabel: 'Support ops',
  },
];

export const DEFAULT_AGENT_SUGGESTIONS: MerchantSuggestedAction[] = MISSION_TEMPLATE_OPTIONS.filter((option) => (
  option.goalType === 'increase_aov'
  || option.goalType === 'reduce_low_stock'
  || option.goalType === 'recover_abandoned_carts'
  || option.goalType === 'clear_dead_inventory'
  || option.goalType === 'improve_first_time_conversion'
));

export function createMissionBlueprint(goalType: AgenticGoalType, customGoal?: string): MissionBlueprint {
  switch (goalType) {
    case 'increase_aov':
      return {
        title: 'Increase average order value',
        goal: customGoal || 'Increase AOV this week',
        scope: 'marketing',
        intentType: goalType,
        steps: [
          'Find high-intent products and likely bundle pairs',
          'Draft cross-sell offers and a segment-aware campaign',
          'Launch upsell execution and monitor conversion lift',
        ],
        progressLabel: 'Preparing cross-sell mission',
        roiSummary: 'Targets larger baskets from existing traffic.',
        requiresApproval: false,
      };
    case 'reduce_low_stock':
      return {
        title: 'Reduce low-stock risk',
        goal: customGoal || 'Protect revenue from low-stock products',
        scope: 'catalog',
        intentType: goalType,
        steps: [
          'Identify low-stock products with active demand',
          'Prioritize replenishment and pause risky promotions',
          'Apply merchandising recommendations and fallback substitutes',
        ],
        progressLabel: 'Auditing stock risk',
        roiSummary: 'Prevents lost revenue from stockouts.',
        requiresApproval: false,
      };
    case 'recover_abandoned_carts':
      return {
        title: 'Recover abandoned carts',
        goal: customGoal || 'Recover stalled checkout sessions',
        scope: 'marketing',
        intentType: goalType,
        steps: [
          'Identify recent high-value abandoned carts',
          'Select best follow-up channel per shopper',
          'Launch recovery messaging and track reactivation',
        ],
        progressLabel: 'Selecting recovery audience',
        roiSummary: 'Targets previously lost revenue.',
        requiresApproval: false,
      };
    case 'clear_dead_inventory':
      return {
        title: 'Clear dead inventory',
        goal: customGoal || 'Move stale products faster',
        scope: 'catalog',
        intentType: goalType,
        steps: [
          'Find stale or under-merchandised inventory',
          'Prepare bundle, badge, and promotion recommendations',
          'Activate cleanup actions and monitor sell-through',
        ],
        progressLabel: 'Scanning stale catalog',
        roiSummary: 'Improves sell-through and catalog quality.',
        requiresApproval: false,
      };
    case 'improve_first_time_conversion':
      return {
        title: 'Improve first-time shopper conversion',
        goal: customGoal || 'Increase conversion for first-time shoppers',
        scope: 'customers',
        intentType: goalType,
        steps: [
          'Identify first-session friction and low-intent stalls',
          'Draft trust-led messaging and segmented offers',
          'Launch a conversion mission and measure lift',
        ],
        progressLabel: 'Analyzing new shopper friction',
        roiSummary: 'Improves acquisition efficiency.',
        requiresApproval: false,
      };
    case 'catalog_cleanup':
      return {
        title: 'Clean up catalog',
        goal: customGoal || 'Clean up catalog quality and pricing hygiene',
        scope: 'catalog',
        intentType: goalType,
        steps: [
          'Audit missing fields and weak merchandising data',
          'Draft cleanup fixes into safe batches',
          'Queue safe catalog improvements',
        ],
        progressLabel: 'Reviewing product hygiene',
        roiSummary: 'Improves storefront quality and AI recommendations.',
        requiresApproval: false,
      };
    case 'customer_winback':
      return {
        title: 'Win back lapsed customers',
        goal: customGoal || 'Re-engage lapsed customers with a targeted recovery mission',
        scope: 'customers',
        intentType: goalType,
        steps: [
          'Identify churn-risk and lapsed customer cohorts',
          'Draft message, offer, and segment strategy',
          'Launch win-back mission and monitor response',
        ],
        progressLabel: 'Building win-back cohort',
        roiSummary: 'Recovers dormant customer value.',
        requiresApproval: false,
      };
    case 'support_triage':
      return {
        title: 'Triage support backlog',
        goal: customGoal || 'Reduce support backlog and fulfillment exceptions',
        scope: 'support',
        intentType: goalType,
        steps: [
          'Classify recent support and fulfillment exceptions',
          'Apply safe automated responses where possible',
          'Escalate blocked cases with summaries',
        ],
        progressLabel: 'Triageing support workload',
        roiSummary: 'Speeds resolution and lowers manual load.',
        requiresApproval: true,
      };
  }
}

function inferMissionGoal(prompt: string): MissionGoalInference {
  const signals = detectPromptSignals(prompt);
  const normalized = signals.normalized;
  const scores: Record<AgenticGoalType, number> = {
    increase_aov: 0,
    reduce_low_stock: 0,
    recover_abandoned_carts: 0,
    clear_dead_inventory: 0,
    improve_first_time_conversion: 0,
    catalog_cleanup: 0,
    customer_winback: 0,
    support_triage: 0,
  };
  const matchedSignals: string[] = [];
  const warnings: string[] = [];

  const addScore = (goalType: AgenticGoalType, score: number, reason: string) => {
    scores[goalType] += score;
    matchedSignals.push(reason);
  };

  for (const rule of PROMPT_CLASSIFIER_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        addScore(rule.goalType, keyword.includes(' ') ? 4 : 3, `matched keyword: ${keyword}`);
      }
    }
  }

  if (signals.wantsDescriptions) addScore('catalog_cleanup', 4, 'wants description work');
  if (signals.wantsProductPageWork) addScore('catalog_cleanup', 2, 'wants product-page work');
  if (signals.wantsPricingWork) addScore('catalog_cleanup', 2, 'wants pricing work');
  if (signals.wantsCampaignWork) addScore('increase_aov', 2, 'wants campaign work');
  if (signals.wantsInventoryWork) addScore(normalized.includes('low stock') || normalized.includes('out of stock') ? 'reduce_low_stock' : 'clear_dead_inventory', 4, 'wants inventory work');
  if (signals.wantsDiscountsOrOffers) addScore('increase_aov', 3, 'wants discounts or offers');
  if (signals.wantsRecovery) addScore('recover_abandoned_carts', 5, 'wants cart recovery');
  if (signals.wantsWinback) addScore('customer_winback', 5, 'wants winback');
  if (signals.wantsSupport) addScore('support_triage', 5, 'wants support triage');
  if (/first time|new shopper|first purchase|new customer/.test(normalized)) addScore('improve_first_time_conversion', 5, 'wants first-time conversion');
  if (signals.looksSpecificTask && (signals.wantsProductPageWork || signals.wantsPricingWork)) addScore('catalog_cleanup', 2, 'specific catalog task');
  if (signals.looksSpecificTask && (signals.wantsCampaignWork || signals.wantsDiscountsOrOffers)) addScore('increase_aov', 2, 'specific revenue task');
  if (signals.looksSpecificTask && signals.wantsSupport) addScore('support_triage', 2, 'specific support task');
  if (signals.looksSpecificTask && signals.wantsWinback) addScore('customer_winback', 2, 'specific retention task');
  if (signals.looksSpecificTask && signals.wantsRecovery) addScore('recover_abandoned_carts', 2, 'specific recovery task');

  if (/product|sku|catalog/.test(normalized)) addScore('catalog_cleanup', 1, 'generic catalog language');
  if (/customer|retention|reactivat/.test(normalized)) addScore('customer_winback', 1, 'generic customer language');
  if (/campaign|discount|offer/.test(normalized)) addScore('increase_aov', 1, 'generic campaign language');

  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]) as Array<[AgenticGoalType, number]>;

  const [topGoal, topScore] = ranked[0];
  const [, secondScore] = ranked[1];

  let confidence = 0.25;
  if (topScore >= 8) confidence = 0.95;
  else if (topScore >= 6) confidence = 0.86;
  else if (topScore >= 4) confidence = 0.74;
  else if (topScore >= 2) confidence = 0.58;
  else if (topScore >= 1) confidence = 0.45;

  if (topScore === 0) {
    if (signals.looksSpecificTask) {
      const fallbackGoalType = signals.wantsSupport
        ? 'support_triage'
        : signals.wantsRecovery
          ? 'recover_abandoned_carts'
          : signals.wantsWinback
            ? 'customer_winback'
            : signals.wantsCampaignWork || signals.wantsDiscountsOrOffers
              ? 'increase_aov'
              : 'catalog_cleanup';
      warnings.push('The request was mapped into the closest supported mission pattern.');
      return {
        goalType: fallbackGoalType,
        confidence: 0.72,
        warnings,
        matchedSignals,
      };
    }

    warnings.push('No strong mission pattern matched the request.');
    return {
      goalType: 'catalog_cleanup',
      confidence: 0.2,
      warnings,
      matchedSignals,
    };
  }

  if (topScore - secondScore <= 1 && secondScore > 0) {
    confidence = Math.min(confidence, 0.55);
    warnings.push('The request matches multiple mission patterns, so the intent is ambiguous.');
  }

  if (signals.looksSpecificTask && topScore >= 2 && topScore - secondScore > 1) {
    confidence = Math.max(confidence, 0.72);
  }

  if (topScore < 4) {
    warnings.push('The request is being interpreted from weak signals and should stay analysis-only until clarified.');
  }

  if (signals.looksSpecificTask && confidence >= 0.72) {
    const weakSignalIndex = warnings.findIndex((warning) => warning.includes('weak signals'));
    if (weakSignalIndex !== -1) {
      warnings.splice(weakSignalIndex, 1);
    }
  }

  return {
    goalType: topGoal,
    confidence,
    warnings,
    matchedSignals,
  };
}

export function inferMissionGoalTypeFromPrompt(prompt: string): AgenticGoalType {
  return inferMissionGoal(prompt).goalType;
}

function getLikelyOutputs(goalType: AgenticGoalType, scope: MerchantMissionSummary['scope']) {
  switch (goalType) {
    case 'catalog_cleanup':
      return [
        'Product page optimization plan',
        'Merchandising fixes and pricing recommendations',
        'Approval-ready catalog change batch',
      ];
    case 'clear_dead_inventory':
      return [
        'Inventory cleanup priorities',
        'Bundle, pricing, and placement recommendations',
        'Approval-ready sell-through actions',
      ];
    case 'reduce_low_stock':
      return [
        'Low-stock risk diagnosis',
        'Substitute and replenishment recommendations',
        'Approval-ready merchandising changes',
      ];
    case 'recover_abandoned_carts':
      return [
        'Recovery audience selection',
        'Channel and message recommendations',
        'Approval-ready recovery launch batch',
      ];
    case 'customer_winback':
      return [
        'Lapsed segment selection',
        'Reactivation strategy and offer recommendations',
        'Approval-ready winback campaign batch',
      ];
    case 'support_triage':
      return [
        'Support priority matrix',
        'Escalation and response plan',
        'Approval-ready resolution batches',
      ];
    default:
      return scope === 'marketing'
        ? ['Revenue opportunity diagnosis', 'Offer and campaign recommendations', 'Approval-ready launch batch']
        : ['Mission brief', 'Execution plan', 'Approval-ready action batch'];
  }
}

function getActionBatches(goalType: AgenticGoalType, scope: MerchantMissionSummary['scope']) {
  switch (goalType) {
    case 'catalog_cleanup':
    case 'clear_dead_inventory':
    case 'reduce_low_stock':
      return ['Catalog edits', 'Merchandising changes', 'Pricing or promotion changes'];
    case 'recover_abandoned_carts':
    case 'increase_aov':
      return ['Audience selection', 'Offer setup', 'Campaign launch'];
    case 'customer_winback':
      return ['Segment confirmation', 'Offer/message rollout', 'Follow-up sequence'];
    case 'support_triage':
      return ['Priority routing', 'Safe automated responses', 'Escalation batch'];
    default:
      return scope === 'support'
        ? ['Support routing', 'Escalation batch']
        : ['Planned action batch'];
  }
}

export function buildMissionBriefFromPrompt(prompt: string, explicitGoalType?: AgenticGoalType): MerchantMissionBrief {
  const inference = explicitGoalType
    ? {
        goalType: explicitGoalType,
        confidence: 0.96,
        warnings: [] as string[],
        matchedSignals: ['explicit goal type provided'],
      }
    : inferMissionGoal(prompt);
  const goalType = inference.goalType;
  const blueprint = createMissionBlueprint(goalType, prompt.trim());
  const promptSpecificCopy = derivePromptSpecificCopy(prompt, goalType, blueprint.scope);
  const signals = detectPromptSignals(prompt);
  const interpretationWarnings = [...inference.warnings];

  if (signals.wantsInventoryLevelChange) {
    interpretationWarnings.push('Direct stock-quantity updates are not supported by the autonomous executor yet.');
  }

  const executionMode = signals.wantsInventoryLevelChange
    ? 'analysis_only'
    : inference.confidence >= 0.7 ? 'actionable' : 'analysis_only';
  const planSummary = executionMode === 'analysis_only'
    ? `${promptSpecificCopy.planSummary}${signals.wantsInventoryLevelChange ? ' Because direct inventory quantity changes are not supported autonomously yet, the agent should stop at diagnosis and proposed actions instead of executing store changes.' : ' Because the mission intent is not yet specific enough, the agent should stop at diagnosis and proposed actions instead of executing a canned workflow.'}`
    : promptSpecificCopy.planSummary;

  return {
    originalPrompt: prompt.trim(),
    objective: prompt.trim(),
    interpretedType: goalType,
    interpretedScope: blueprint.scope,
    interpretationConfidence: inference.confidence,
    executionMode,
    interpretationWarnings,
    merchantFacingTitle: promptSpecificCopy.merchantFacingTitle,
    planSummary,
    planSteps: blueprint.steps,
    approvalStrategy: {
      initialPlan: 'required',
      writeBatches: 'required',
    },
    likelyOutputs: executionMode === 'analysis_only'
      ? ['Mission diagnosis', 'Clarifying questions or assumptions', 'Approval-ready proposed actions']
      : promptSpecificCopy.likelyOutputs,
    actionBatches: executionMode === 'analysis_only'
      ? ['Clarify mission scope', 'Review proposed actions', 'Approve a narrower execution batch']
      : promptSpecificCopy.actionBatches,
  };
}
