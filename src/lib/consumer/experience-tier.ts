export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type ExperienceTier = 'preferred' | 'standard' | 'restricted'

interface TierInfo {
  confidence: ConfidenceLevel
  confidenceLabel: string
  tier: ExperienceTier
  tierLabel: string
  color: string
  bgColor: string
  description: string
}

const TIERS: Record<ConfidenceLevel, TierInfo> = {
  high: {
    confidence: 'high',
    confidenceLabel: 'High',
    tier: 'preferred',
    tierLabel: 'Preferred',
    color: 'text-vercel-success',
    bgColor: 'bg-vercel-success/10',
    description: 'Auto-approval eligible',
  },
  medium: {
    confidence: 'medium',
    confidenceLabel: 'Medium',
    tier: 'standard',
    tierLabel: 'Standard',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    description: 'Standard flow',
  },
  low: {
    confidence: 'low',
    confidenceLabel: 'Low',
    tier: 'restricted',
    tierLabel: 'Restricted',
    color: 'text-vercel-error',
    bgColor: 'bg-vercel-error/10',
    description: 'Review recommended',
  },
}

export function getConfidenceLevel(trustScore: number): ConfidenceLevel {
  if (trustScore >= 85) return 'high'
  if (trustScore >= 60) return 'medium'
  return 'low'
}

export function getExperienceTier(trustScore: number): TierInfo {
  return TIERS[getConfidenceLevel(trustScore)]
}

export function getConfidenceLabel(trustScore: number): string {
  return TIERS[getConfidenceLevel(trustScore)].confidenceLabel
}

export function getTierLabel(trustScore: number): string {
  return TIERS[getConfidenceLevel(trustScore)].tierLabel
}

export function formatConfidenceForSummary(trustScore: number): string {
  const tier = getExperienceTier(trustScore)
  return `${tier.confidenceLabel} confidence customer — ${tier.description.toLowerCase()}`
}
