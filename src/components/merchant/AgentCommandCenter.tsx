"use client";

import type { MerchantSuggestedAction } from '@/types';

interface AgentCommandCenterProps {
  title?: string
  description?: string
  suggestions: MerchantSuggestedAction[]
  onMissionCreated?: () => void
}

export function AgentCommandCenter(props: AgentCommandCenterProps) {
  void props;
  return null;
}
