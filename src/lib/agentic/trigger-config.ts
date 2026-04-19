import type { AgenticTriggerSettings } from '@/types';

export const DEFAULT_AGENTIC_TRIGGER_SETTINGS: AgenticTriggerSettings = {
  abandonedCartRecovery: {
    enabled: true,
    cooldownHours: 6,
    minCount: 3,
  },
  lowStockRisk: {
    enabled: true,
    cooldownHours: 12,
    minCount: 3,
  },
  deadInventoryCleanup: {
    enabled: true,
    cooldownHours: 24,
    minCount: 5,
  },
};
