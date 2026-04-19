"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Megaphone, Lightbulb, Bug, ChevronUp, Clock, Loader2, Plus, Sparkles,
  Wrench, AlertTriangle, ArrowLeft, Send, Flame, TrendingUp,
  CheckCircle2, XCircle, Search, Zap, Shield, Star, ArrowUpRight,
  Activity, CircleDot, Eye, MessageSquare, Hash, ChevronRight,
  BarChart3, Target, Rocket, ChevronDown, Users, GitBranch, AlertCircle,
  X, Tag, Code2, Minus,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ChangeItem {
  label: string
  items: string[]
}

interface ChangelogEntry {
  id: string
  title: string
  description: string
  type: "feature" | "improvement" | "fix" | "announcement"
  version?: string
  changes?: ChangeItem[]
  breaking?: boolean
  contributors?: string[]
  created_at: string
}

interface FeatureRequest {
  id: string
  user_id: string
  title: string
  description: string
  status: string
  upvotes: number
  created_at: string
  has_voted?: boolean
}

interface BugReport {
  id: string
  user_id: string
  title: string
  description: string
  severity: string
  status: string
  created_at: string
}

const typeConfig = {
  feature: { icon: Sparkles, label: "Feature", gradient: "from-violet-500 to-purple-600", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/20", dot: "bg-violet-400", glowColor: "violet" },
  improvement: { icon: Wrench, label: "Improvement", gradient: "from-blue-500 to-cyan-500", color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/20", dot: "bg-blue-400", glowColor: "blue" },
  fix: { icon: Shield, label: "Bug Fix", gradient: "from-emerald-500 to-green-500", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400", glowColor: "emerald" },
  announcement: { icon: Megaphone, label: "Announcement", gradient: "from-amber-500 to-orange-500", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400", glowColor: "amber" },
}

const severityConfig: Record<string, { color: string; bg: string; border: string; gradient: string; icon: React.ElementType }> = {
  low: { color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/20", gradient: "from-slate-500 to-slate-600", icon: CircleDot },
  medium: { color: "text-yellow-300", bg: "bg-yellow-500/10", border: "border-yellow-500/20", gradient: "from-yellow-500 to-amber-500", icon: AlertTriangle },
  high: { color: "text-orange-300", bg: "bg-orange-500/10", border: "border-orange-500/20", gradient: "from-orange-500 to-red-500", icon: Flame },
  critical: { color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/20", gradient: "from-red-500 to-rose-600", icon: Zap },
}

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  pending: { color: "text-neutral-300", bg: "bg-neutral-500/10", border: "border-neutral-500/20", icon: Clock, label: "Pending" },
  planned: { color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Target, label: "Planned" },
  in_progress: { color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/20", icon: Loader2, label: "In Progress" },
  completed: { color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2, label: "Completed" },
  declined: { color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle, label: "Declined" },
  open: { color: "text-yellow-300", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: Eye, label: "Open" },
  investigating: { color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Search, label: "Investigating" },
  fixed: { color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2, label: "Fixed" },
  wont_fix: { color: "text-neutral-300", bg: "bg-neutral-500/10", border: "border-neutral-500/20", icon: XCircle, label: "Won't Fix" },
}

const changeLabelConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Added: { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Plus },
  Improved: { color: "text-blue-400", bg: "bg-blue-500/10", icon: TrendingUp },
  Fixed: { color: "text-amber-400", bg: "bg-amber-500/10", icon: Wrench },
  Breaking: { color: "text-red-400", bg: "bg-red-500/10", icon: AlertCircle },
  Security: { color: "text-rose-400", bg: "bg-rose-500/10", icon: Shield },
  Technical: { color: "text-cyan-400", bg: "bg-cyan-500/10", icon: Code2 },
  Launched: { color: "text-violet-400", bg: "bg-violet-500/10", icon: Rocket },
  Architecture: { color: "text-indigo-400", bg: "bg-indigo-500/10", icon: GitBranch },
}

type ActiveTab = "changelog" | "features" | "bugs"

export default function FeedbackPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>("changelog")
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [features, setFeatures] = useState<FeatureRequest[]>([])
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formSeverity, setFormSeverity] = useState("medium")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [votingId, setVotingId] = useState<string | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id)
      else setUserId(null)
        setAuthChecked(true)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }, [])

  const fetchChangelog = useCallback(async () => {
    const res = await fetch("/api/feedback/changelog")
    const data = await res.json()
    if (Array.isArray(data)) {
      setChangelog(data.map((d: Record<string, unknown>) => ({
        ...d,
        changes: typeof d.changes === "string" ? JSON.parse(d.changes as string) : (d.changes || []),
        contributors: typeof d.contributors === "string" ? JSON.parse(d.contributors as string) : (d.contributors || []),
      })) as ChangelogEntry[])
      if (data.length > 0) setExpandedEntries(new Set([data[0].id]))
    }
  }, [])

  const fetchFeatures = useCallback(async () => {
    const authHeaders = await getAuthHeaders()
    const res = await fetch("/api/feedback/features", { headers: authHeaders })
    const data = await res.json()
    if (Array.isArray(data)) setFeatures(data)
  }, [getAuthHeaders])

  const fetchBugs = useCallback(async () => {
    const res = await fetch("/api/feedback/bugs")
    const data = await res.json()
    if (Array.isArray(data)) setBugs(data)
  }, [])

  useEffect(() => {
    if (!authChecked) return
    setLoading(true)
    Promise.all([fetchChangelog(), fetchFeatures(), fetchBugs()]).finally(() => setLoading(false))
  }, [authChecked, fetchChangelog, fetchFeatures, fetchBugs])

  const toggleEntry = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleVote = async (featureId: string) => {
    if (!userId) return
    setVotingId(featureId)
    setFeatures(prev => prev.map(f =>
      f.id === featureId
        ? { ...f, has_voted: !f.has_voted, upvotes: f.has_voted ? Math.max(0, f.upvotes - 1) : f.upvotes + 1 }
        : f
    ))
    const authHeaders = await getAuthHeaders()
    await fetch("/api/feedback/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ feature_request_id: featureId }),
    })
    setVotingId(null)
  }

  const handleSubmitFeature = async () => {
    if (!userId || !formTitle.trim() || !formDesc.trim()) return
    setSubmitting(true)
    const authHeaders = await getAuthHeaders()
    await fetch("/api/feedback/features", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ title: formTitle, description: formDesc }),
    })
    setFormTitle("")
    setFormDesc("")
    setShowForm(false)
    await fetchFeatures()
    setSubmitting(false)
  }

  const handleSubmitBug = async () => {
    if (!userId || !formTitle.trim() || !formDesc.trim()) return
    setSubmitting(true)
    const authHeaders = await getAuthHeaders()
    await fetch("/api/feedback/bugs", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ title: formTitle, description: formDesc, severity: formSeverity }),
    })
    setFormTitle("")
    setFormDesc("")
    setFormSeverity("medium")
    setShowForm(false)
    await fetchBugs()
    setSubmitting(false)
  }

  const resetForm = () => {
    setShowForm(false)
    setFormTitle("")
    setFormDesc("")
    setFormSeverity("medium")
  }

  const filteredFeatures = features.filter(f => {
    const matchesSearch = !searchQuery || f.title.toLowerCase().includes(searchQuery.toLowerCase()) || f.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || f.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredBugs = bugs.filter(b => {
    const matchesSearch = !searchQuery || b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || b.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = useMemo(() => ({
    totalUpdates: changelog.length,
    totalFeatures: features.length,
    totalBugs: bugs.length,
    totalVotes: features.reduce((a, f) => a + f.upvotes, 0),
  }), [changelog, features, bugs])

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const formatFullDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  }

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "changelog", label: "Changelog", icon: Rocket, count: changelog.length },
    { id: "features", label: "Requests", icon: Lightbulb, count: features.length },
    { id: "bugs", label: "Bug Reports", icon: Bug, count: bugs.length },
  ]

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-violet-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-violet-600/[0.07] via-purple-500/[0.03] to-transparent rounded-full blur-[100px]" />
        <div className="absolute top-[20%] -right-[20%] w-[600px] h-[600px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#09090b]/80 border-b border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-neutral-500 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-white/[0.06]" />
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size="sm" />
            </Link>
            <div className="w-px h-5 bg-white/[0.06] hidden sm:block" />
            <span className="text-[13px] text-neutral-500 hidden sm:block">Feedback</span>
          </div>
          <div className="flex items-center gap-3">
            {userId ? (
                <button onClick={async () => { await supabase.auth.signOut(); setUserId(null); }} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/[0.12] hover:bg-emerald-500/[0.14] transition-colors cursor-pointer">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-400 font-medium">Signed in</span>
                  <X className="w-3 h-3 text-emerald-400/60 ml-1" />
                </button>
            ) : authChecked ? (
              <Link href="/login">
                <Button size="sm" className="h-8 px-4 text-xs bg-white text-black hover:bg-neutral-200 rounded-lg font-medium">
                  Sign in
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative max-w-[1200px] mx-auto px-6">
        <section className="pt-16 pb-12">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/[0.08] border border-violet-500/[0.12]">
                <Activity className="w-3 h-3 text-violet-400" />
                <span className="text-[11px] text-violet-400 font-medium tracking-wide uppercase">Live</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-violet-500/20 to-transparent" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-b from-white via-white to-neutral-400 bg-clip-text text-transparent pb-1">
              Feedback Hub
            </h1>
            <p className="text-neutral-500 text-base sm:text-lg mt-3 max-w-lg leading-relaxed">
              Shape the future of Convos. Track updates, vote on features, and report issues.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10"
          >
            {[
              { label: "Updates", value: stats.totalUpdates, icon: Rocket, gradient: "from-violet-500/10 to-violet-600/5", borderColor: "border-violet-500/10", iconColor: "text-violet-400" },
              { label: "Requests", value: stats.totalFeatures, icon: Lightbulb, gradient: "from-amber-500/10 to-amber-600/5", borderColor: "border-amber-500/10", iconColor: "text-amber-400" },
              { label: "Bug Reports", value: stats.totalBugs, icon: Bug, gradient: "from-red-500/10 to-red-600/5", borderColor: "border-red-500/10", iconColor: "text-red-400" },
              { label: "Total Votes", value: stats.totalVotes, icon: TrendingUp, gradient: "from-emerald-500/10 to-emerald-600/5", borderColor: "border-emerald-500/10", iconColor: "text-emerald-400" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className={`relative p-4 rounded-2xl bg-gradient-to-b ${stat.gradient} border ${stat.borderColor} overflow-hidden group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                  <BarChart3 className="w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-500 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
                <p className="text-[11px] text-neutral-500 font-medium mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="sticky top-14 z-40 -mx-6 px-6 py-4 backdrop-blur-2xl bg-[#09090b]/80"
        >
          <div className="flex items-center gap-6 border-b border-white/[0.04] pb-4">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setShowForm(false); setSearchQuery(""); setStatusFilter("all") }}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white/[0.07] rounded-xl border border-white/[0.08]"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <tab.icon className={`w-4 h-4 relative z-10 ${isActive ? "text-violet-400" : ""}`} />
                    <span className="relative z-10">{tab.label}</span>
                    <span className={`relative z-10 text-[11px] px-1.5 py-0.5 rounded-md ${isActive ? "bg-white/10 text-white" : "text-neutral-600"}`}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex-1" />
            {activeTab !== "changelog" && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
                  <input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-9 w-48 pl-9 pr-3 text-sm bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-neutral-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/30 transition-all"
                  />
                </div>
                {userId && (
                  <Button
                    onClick={() => { setShowForm(true); setFormTitle(""); setFormDesc("") }}
                    size="sm"
                    className={`h-9 px-4 text-xs font-semibold rounded-xl gap-1.5 ${
                      activeTab === "features"
                        ? "bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/20"
                        : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {activeTab === "features" ? "New Request" : "Report Bug"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {activeTab !== "changelog" && (
            <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
              {(activeTab === "features"
                ? ["all", "pending", "planned", "in_progress", "completed", "declined"]
                : ["all", "open", "investigating", "fixed", "wont_fix"]
              ).map(s => {
                const isAct = statusFilter === s
                const config = s !== "all" ? statusConfig[s] : null
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                      isAct
                        ? "bg-white/[0.08] text-white border border-white/[0.08]"
                        : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    {config && <config.icon className={`w-3 h-3 ${isAct ? config.color : ""}`} />}
                    {s === "all" ? "All" : (config?.label || s)}
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>

        <section className="py-8 pb-24">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-5">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/[0.06] border border-violet-500/[0.1] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-300">Loading feedback</p>
                <p className="text-xs text-neutral-600 mt-1">Fetching the latest data...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "changelog" && (
                <motion.div
                  key="changelog"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  {changelog.length === 0 ? (
                    <EmptyState icon={Rocket} title="No updates yet" subtitle="We'll post updates here as we ship new features and improvements." />
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[23px] sm:left-[31px] top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/20 via-white/[0.04] to-transparent" />

                      <div className="space-y-0">
                        {changelog.map((entry, index) => {
                          const config = typeConfig[entry.type]
                          const Icon = config.icon
                          const isExpanded = expandedEntries.has(entry.id)
                          const changes = (entry.changes || []) as ChangeItem[]
                          const contributors = (entry.contributors || []) as string[]
                          const totalChanges = changes.reduce((acc, c) => acc + c.items.length, 0)

                          return (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <div className="group relative flex gap-4 sm:gap-6">
                                <div className="relative flex flex-col items-center z-10 pt-8">
                                  <div className={`relative w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg ring-4 ring-[#09090b]`}>
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0 pb-2">
                                  <button
                                    onClick={() => toggleEntry(entry.id)}
                                    className="w-full text-left"
                                  >
                                    <div className={`relative p-5 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                                      isExpanded
                                        ? "bg-white/[0.03] border-white/[0.08] shadow-2xl shadow-black/30"
                                        : "bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.025] hover:border-white/[0.07]"
                                    }`}>
                                      {entry.breaking && (
                                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent rounded-t-2xl" />
                                      )}
                                      {isExpanded && !entry.breaking && (
                                        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${config.glowColor}-500/30 to-transparent rounded-t-2xl`} />
                                      )}

                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap mb-3">
                                            {entry.version && (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] font-mono font-semibold text-neutral-300">
                                                <Tag className="w-2.5 h-2.5" />
                                                {entry.version}
                                              </span>
                                            )}
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${config.bg} ${config.border} ${config.color} border`}>
                                              <Icon className="w-2.5 h-2.5" />
                                              {config.label}
                                            </span>
                                            {entry.breaking && (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-red-500/10 border border-red-500/20 text-red-300">
                                                <AlertCircle className="w-2.5 h-2.5" />
                                                Breaking
                                              </span>
                                            )}
                                            <span className="text-[11px] text-neutral-600">{formatFullDate(entry.created_at)}</span>
                                          </div>

                                          <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-violet-100 transition-colors leading-snug">
                                            {entry.title}
                                          </h3>
                                          <p className={`text-[13px] sm:text-[14px] text-neutral-400 leading-relaxed mt-2 ${isExpanded ? "" : "line-clamp-2"}`}>
                                            {entry.description}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 mt-1">
                                          {totalChanges > 0 && (
                                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-neutral-600">
                                              <Code2 className="w-3 h-3" />
                                              {totalChanges} change{totalChanges !== 1 ? "s" : ""}
                                            </span>
                                          )}
                                          <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                                          >
                                            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                                          </motion.div>
                                        </div>
                                      </div>

                                      {!isExpanded && (
                                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.04]">
                                          {contributors.length > 0 && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                                              <Users className="w-3 h-3" />
                                              {contributors.join(", ")}
                                            </div>
                                          )}
                                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(entry.created_at)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {isExpanded && changes.length > 0 && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="overflow-hidden"
                                      >
                                        <div className="mt-1 ml-0 sm:ml-0">
                                          <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.015] border border-white/[0.04] space-y-5">
                                            {changes.map((changeGroup, gi) => {
                                              const labelConf = changeLabelConfig[changeGroup.label] || { color: "text-neutral-400", bg: "bg-neutral-500/10", icon: Minus }
                                              const LabelIcon = labelConf.icon
                                              return (
                                                <div key={gi}>
                                                  <div className="flex items-center gap-2 mb-3">
                                                    <div className={`w-6 h-6 rounded-lg ${labelConf.bg} flex items-center justify-center`}>
                                                      <LabelIcon className={`w-3 h-3 ${labelConf.color}`} />
                                                    </div>
                                                    <span className={`text-[12px] font-bold uppercase tracking-wider ${labelConf.color}`}>
                                                      {changeGroup.label}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-700 font-medium">{changeGroup.items.length} item{changeGroup.items.length !== 1 ? "s" : ""}</span>
                                                    <div className="flex-1 h-px bg-white/[0.03]" />
                                                  </div>
                                                  <ul className="space-y-2 ml-1">
                                                    {changeGroup.items.map((item, ii) => (
                                                      <motion.li
                                                        key={ii}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: gi * 0.05 + ii * 0.03 }}
                                                        className="flex items-start gap-3 group/item"
                                                      >
                                                        <div className={`mt-[7px] w-1 h-1 rounded-full shrink-0 ${labelConf.color.replace("text-", "bg-")} opacity-60`} />
                                                        <span className="text-[13px] text-neutral-400 leading-relaxed group-hover/item:text-neutral-300 transition-colors">
                                                          {item}
                                                        </span>
                                                      </motion.li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )
                                            })}

                                            <div className="flex items-center gap-4 pt-4 border-t border-white/[0.04]">
                                              {contributors.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                  <Users className="w-3.5 h-3.5 text-neutral-600" />
                                                  <div className="flex items-center gap-1.5">
                                                    {contributors.map((c, ci) => (
                                                      <span key={ci} className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] text-neutral-400 font-medium">
                                                        {c}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              <div className="flex-1" />
                                              <div className="flex items-center gap-3 text-[11px] text-neutral-600">
                                                <span className="flex items-center gap-1">
                                                  <Hash className="w-3 h-3" />
                                                  {entry.id.slice(0, 8)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                  <Clock className="w-3 h-3" />
                                                  {formatDate(entry.created_at)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "features" && (
                <motion.div
                  key="features"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <AnimatePresence>
                    {showForm && userId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="relative p-6 rounded-2xl bg-gradient-to-b from-violet-500/[0.06] via-[#09090b] to-[#09090b] border border-violet-500/[0.12] overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                              <Lightbulb className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-white">New Feature Request</h3>
                              <p className="text-[11px] text-neutral-500">Describe what you&apos;d like to see built</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Title</label>
                              <Input placeholder="e.g. Add bulk product import via CSV" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="h-11 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-600 rounded-xl focus:ring-violet-500/30 focus:border-violet-500/30" />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Description</label>
                              <Textarea placeholder="What problem does this solve? How would it work? Be as detailed as possible..." value={formDesc} onChange={e => setFormDesc(e.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-600 rounded-xl min-h-[140px] focus:ring-violet-500/30 focus:border-violet-500/30 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-1">
                              <Button onClick={handleSubmitFeature} disabled={submitting || !formTitle.trim() || !formDesc.trim()} className="h-11 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/20 disabled:opacity-30 transition-all">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Submit Request
                              </Button>
                              <Button onClick={resetForm} variant="ghost" className="h-11 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5">Cancel</Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!userId && authChecked && <AuthBanner message="Sign in as a merchant to submit requests and vote on features" />}

                  {filteredFeatures.length === 0 ? (
                    <EmptyState icon={Lightbulb} title="No feature requests yet" subtitle={searchQuery ? "Try a different search term." : "Be the first to submit a feature request!"} />
                  ) : (
                    <div className="space-y-3">
                      {filteredFeatures.map((feature, index) => {
                        const status = statusConfig[feature.status] || statusConfig.pending
                        const StatusIcon = status.icon
                        const isTop = feature.upvotes >= 5
                        return (
                          <motion.div
                            key={feature.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className={`group relative rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-black/20 ${
                              isTop ? "bg-gradient-to-r from-violet-500/[0.04] to-transparent border-violet-500/[0.12]" : "bg-white/[0.015] border-white/[0.05] hover:border-white/[0.1]"
                            }`}
                          >
                            {isTop && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />}
                            <div className="flex">
                              <button
                                onClick={() => handleVote(feature.id)}
                                disabled={!userId || votingId === feature.id}
                                className={`flex flex-col items-center justify-center gap-1 px-5 py-5 border-r transition-all duration-200 min-w-[72px] rounded-l-2xl ${
                                  feature.has_voted ? "bg-violet-500/[0.08] border-violet-500/[0.12] text-violet-300" : "border-white/[0.04] text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.02]"
                                } ${!userId ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                <ChevronUp className={`w-5 h-5 transition-transform ${feature.has_voted ? "text-violet-400 -translate-y-0.5" : ""}`} />
                                <span className={`text-base font-bold tabular-nums ${feature.has_voted ? "text-violet-300" : "text-neutral-400"}`}>{feature.upvotes}</span>
                              </button>
                              <div className="flex-1 p-5 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  {isTop && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-300 uppercase tracking-wider">
                                      <Star className="w-2.5 h-2.5" /> Trending
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${status.bg} ${status.border} ${status.color} border`}>
                                    <StatusIcon className={`w-2.5 h-2.5 ${feature.status === "in_progress" ? "animate-spin" : ""}`} />
                                    {status.label}
                                  </span>
                                </div>
                                <h3 className="text-[15px] font-semibold text-white mt-2 group-hover:text-violet-200 transition-colors">{feature.title}</h3>
                                <p className="text-[13px] text-neutral-500 leading-relaxed mt-1.5 line-clamp-2">{feature.description}</p>
                                <div className="flex items-center gap-4 mt-4 text-[11px] text-neutral-600">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(feature.created_at)}</span>
                                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{feature.upvotes} vote{feature.upvotes !== 1 ? "s" : ""}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "bugs" && (
                <motion.div
                  key="bugs"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <AnimatePresence>
                    {showForm && userId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="relative p-6 rounded-2xl bg-gradient-to-b from-red-500/[0.06] via-[#09090b] to-[#09090b] border border-red-500/[0.12] overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                              <Bug className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-white">Report a Bug</h3>
                              <p className="text-[11px] text-neutral-500">Help us squash issues faster</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Title</label>
                              <Input placeholder="e.g. Checkout fails when applying discount code" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="h-11 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-600 rounded-xl focus:ring-red-500/30 focus:border-red-500/30" />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Steps to Reproduce</label>
                              <Textarea placeholder={"1. Go to...\n2. Click on...\n3. Observe that..."} value={formDesc} onChange={e => setFormDesc(e.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-neutral-600 rounded-xl min-h-[140px] focus:ring-red-500/30 focus:border-red-500/30 resize-none" />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Severity</label>
                              <div className="grid grid-cols-4 gap-2">
                                {(["low", "medium", "high", "critical"] as const).map(s => {
                                  const sc = severityConfig[s]
                                  const SevIcon = sc.icon
                                  const isSelected = formSeverity === s
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => setFormSeverity(s)}
                                      className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all duration-200 ${
                                        isSelected ? `${sc.bg} ${sc.border} ${sc.color} ring-1 ring-white/5` : "bg-white/[0.02] border-white/[0.06] text-neutral-500 hover:border-white/10"
                                      }`}
                                    >
                                      <SevIcon className="w-4 h-4" />
                                      <span className="text-[11px] font-semibold capitalize">{s}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                              <Button onClick={handleSubmitBug} disabled={submitting || !formTitle.trim() || !formDesc.trim()} className="h-11 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-semibold shadow-lg shadow-red-500/20 disabled:opacity-30 transition-all">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Submit Report
                              </Button>
                              <Button onClick={resetForm} variant="ghost" className="h-11 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5">Cancel</Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!userId && authChecked && <AuthBanner message="Sign in as a merchant to report bugs" />}

                  {filteredBugs.length === 0 ? (
                    <EmptyState icon={Bug} title="No bug reports found" subtitle={searchQuery ? "Try a different search term." : "No bugs reported yet - that's great!"} />
                  ) : (
                    <div className="space-y-3">
                      {filteredBugs.map((bug, index) => {
                        const sev = severityConfig[bug.severity] || severityConfig.medium
                        const status = statusConfig[bug.status] || statusConfig.open
                        const StatusIcon = status.icon
                        const SevIcon = sev.icon
                        const isCritical = bug.severity === "critical" || bug.severity === "high"
                        return (
                          <motion.div
                            key={bug.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className={`group relative rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-black/20 ${
                              isCritical ? "bg-gradient-to-r from-red-500/[0.03] to-transparent border-red-500/[0.1]" : "bg-white/[0.015] border-white/[0.05] hover:border-white/[0.1]"
                            }`}
                          >
                            {isCritical && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />}
                            <div className="flex">
                              <div className={`flex flex-col items-center justify-center px-5 py-5 border-r min-w-[72px] rounded-l-2xl ${isCritical ? "border-red-500/[0.08]" : "border-white/[0.04]"}`}>
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sev.gradient} flex items-center justify-center shadow-lg`}>
                                  <SevIcon className="w-4 h-4 text-white" />
                                </div>
                              </div>
                              <div className="flex-1 p-5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${sev.bg} ${sev.border} ${sev.color} border`}>{bug.severity}</span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${status.bg} ${status.border} ${status.color} border`}>
                                    <StatusIcon className={`w-2.5 h-2.5 ${bug.status === "investigating" ? "animate-pulse" : ""}`} />
                                    {status.label}
                                  </span>
                                </div>
                                <h3 className="text-[15px] font-semibold text-white mt-2 group-hover:text-red-200 transition-colors">{bug.title}</h3>
                                <p className="text-[13px] text-neutral-500 leading-relaxed mt-1.5 line-clamp-2">{bug.description}</p>
                                <div className="flex items-center gap-4 mt-4 text-[11px] text-neutral-600">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(bug.created_at)}</span>
                                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{bug.id.slice(0, 8)}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </section>
      </main>
    </div>
  )
}

function AuthBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500/[0.04] to-transparent border border-amber-500/[0.08] flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <p className="text-sm text-neutral-400">{message}</p>
      </div>
      <Link href="/login">
        <Button size="sm" className="h-8 px-4 text-xs bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/[0.06]">
          Sign in <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </Link>
    </motion.div>
  )
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-5">
      <div className="relative">
        <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-violet-500/10 blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <Icon className="w-7 h-7 text-neutral-600" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-neutral-300">{title}</p>
        <p className="text-[13px] text-neutral-600 mt-1.5 max-w-sm">{subtitle}</p>
      </div>
    </div>
  )
}
