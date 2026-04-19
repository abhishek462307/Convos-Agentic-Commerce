"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, Radar, Check } from 'lucide-react'

interface PinnedMissionsProps {
  intents: any[]
  plans: any[]
  isCompact?: boolean
}

const statusLabels: Record<string, string> = {
  purchase: 'Tracking price',
  wishlist: 'Watching stock',
  price_watch: 'Monitoring price',
  restock: 'Watching availability',
  gift: 'Planning gift',
}

function getMissionVerb(intent: any, plan: any): string {
  if (plan?.status === 'completed') return 'Completed'
  const step = plan?.steps?.[plan?.current_step || 0]
  if (step) return step.length > 50 ? step.slice(0, 47) + '...' : step
  return statusLabels[intent.intent_type] || 'Working on it'
}

export function PinnedMissions({ intents, plans, isCompact = false }: PinnedMissionsProps) {
  const [expanded, setExpanded] = useState(false)

  const active = intents.filter(i => i.status === 'active' || i.status === 'in_progress')
  if (active.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full ${isCompact ? 'mb-3' : 'mb-2'}`}
    >
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border transition-all hover:border-primary/30"
        style={{
          backgroundColor: 'rgba(var(--primary-rgb, 0,0,0), 0.04)',
          borderColor: 'rgba(var(--primary-rgb, 0,0,0), 0.08)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <Radar className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
            <span className="text-[11px] font-bold truncate" style={{ color: 'var(--store-text)' }}>
              Your AI is working for you — {active.length} active mission{active.length > 1 ? 's' : ''}
            </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5 px-1">
              {active.map(intent => {
                const plan = plans.find((p: any) => p.intent_id === intent.id)
                const isCompleted = plan?.status === 'completed'

                return (
                  <div
                    key={intent.id}
                    className="flex items-start gap-2.5 px-3 py-2 rounded-xl border bg-white/60"
                    style={{ borderColor: 'var(--store-border)' }}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-100' : 'bg-primary/10'}`}>
                      {isCompleted ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold leading-snug truncate" style={{ color: 'var(--store-text)' }}>
                        {intent.goal}
                      </p>
                      <p className="text-[9px] font-medium mt-0.5 truncate" style={{ color: 'var(--store-text-muted)' }}>
                        {getMissionVerb(intent, plan)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
