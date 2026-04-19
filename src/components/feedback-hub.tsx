"use client"

import React, { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquarePlus, Megaphone, Lightbulb, Bug, ChevronUp, Clock, Loader2, Plus, Sparkles, Wrench, AlertTriangle } from "lucide-react"

interface ChangelogEntry {
  id: string
  title: string
  description: string
  type: "feature" | "improvement" | "fix" | "announcement"
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
  feature: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  improvement: { icon: Wrench, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  fix: { icon: Bug, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  announcement: { icon: Megaphone, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
}

const severityConfig = {
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
}

const statusConfig: Record<string, string> = {
  pending: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  planned: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  declined: "bg-red-500/10 text-red-400 border-red-500/20",
  open: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  investigating: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  fixed: "bg-green-500/10 text-green-400 border-green-500/20",
  wont_fix: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

export function FeedbackHub({ variant = "footer" }: { variant?: "footer" | "merchant" }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("changelog")
  const [userId, setUserId] = useState<string | null>(null)
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [features, setFeatures] = useState<FeatureRequest[]>([])
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formSeverity, setFormSeverity] = useState("medium")

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const fetchChangelog = useCallback(async () => {
    const { data } = await supabase.from("changelog").select("*").order("created_at", { ascending: false })
    if (data) setChangelog(data)
  }, [])

  const fetchFeatures = useCallback(async () => {
    const { data } = await supabase.from("feature_requests").select("*").order("upvotes", { ascending: false })
    if (data && userId) {
      const { data: votes } = await supabase.from("feature_request_votes").select("feature_request_id").eq("user_id", userId)
      const votedIds = new Set(votes?.map(v => v.feature_request_id) || [])
      setFeatures(data.map(f => ({ ...f, has_voted: votedIds.has(f.id) })))
    } else if (data) {
      setFeatures(data)
    }
  }, [userId])

  const fetchBugs = useCallback(async () => {
    const { data } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false })
    if (data) setBugs(data)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([fetchChangelog(), fetchFeatures(), fetchBugs()]).finally(() => setLoading(false))
  }, [open, fetchChangelog, fetchFeatures, fetchBugs])

  const handleVote = async (featureId: string, hasVoted: boolean) => {
    if (!userId) return
    if (hasVoted) {
      await supabase.from("feature_request_votes").delete().eq("feature_request_id", featureId).eq("user_id", userId)
      await supabase.from("feature_requests").update({ upvotes: Math.max(0, (features.find(f => f.id === featureId)?.upvotes || 1) - 1) }).eq("id", featureId)
    } else {
      await supabase.from("feature_request_votes").insert({ feature_request_id: featureId, user_id: userId })
      await supabase.from("feature_requests").update({ upvotes: (features.find(f => f.id === featureId)?.upvotes || 0) + 1 }).eq("id", featureId)
    }
    fetchFeatures()
  }

  const handleSubmitFeature = async () => {
    if (!userId || !formTitle.trim() || !formDesc.trim()) return
    setSubmitting(true)
    await supabase.from("feature_requests").insert({ user_id: userId, title: formTitle, description: formDesc })
    setFormTitle("")
    setFormDesc("")
    setShowForm(false)
    await fetchFeatures()
    setSubmitting(false)
  }

  const handleSubmitBug = async () => {
    if (!userId || !formTitle.trim() || !formDesc.trim()) return
    setSubmitting(true)
    await supabase.from("bug_reports").insert({ user_id: userId, title: formTitle, description: formDesc, severity: formSeverity })
    setFormTitle("")
    setFormDesc("")
    setFormSeverity("medium")
    setShowForm(false)
    await fetchBugs()
    setSubmitting(false)
  }

  if (!userId) return null

  const triggerButton = variant === "merchant" ? (
    <button className="flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all rounded-lg group text-muted-foreground hover:text-foreground hover:bg-secondary/50 w-full">
      <MessageSquarePlus className="w-4 h-4 transition-colors group-hover:text-foreground" />
      Feedback Hub
    </button>
  ) : (
    <button className="text-neutral-500 hover:text-white text-sm transition-colors duration-200">
      Feedback Hub
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-neutral-950 border-neutral-800 text-white p-0 gap-0 max-h-[85vh] overflow-hidden" showCloseButton={true}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-semibold tracking-tight text-white">Feedback Hub</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setShowForm(false) }} className="flex flex-col flex-1 gap-0">
          <div className="px-6 pt-4">
            <TabsList className="bg-neutral-900 border border-neutral-800 w-full">
              <TabsTrigger value="changelog" className="flex-1 text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-white text-neutral-500">
                <Megaphone className="w-3.5 h-3.5 mr-1.5" />
                Changelog
              </TabsTrigger>
              <TabsTrigger value="features" className="flex-1 text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-white text-neutral-500">
                <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="bugs" className="flex-1 text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-white text-neutral-500">
                <Bug className="w-3.5 h-3.5 mr-1.5" />
                Bugs
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[55vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
              </div>
            ) : (
              <>
                <TabsContent value="changelog" className="mt-0">
                  {changelog.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-8">No changelog entries yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {changelog.map((entry) => {
                        const config = typeConfig[entry.type]
                        const Icon = config.icon
                        return (
                          <div key={entry.id} className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/60 hover:border-neutral-700/60 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-lg border ${config.bg} mt-0.5`}>
                                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-white">{entry.title}</span>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${config.bg} ${config.color}`}>
                                    {entry.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-neutral-400 leading-relaxed">{entry.description}</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Clock className="w-3 h-3 text-neutral-600" />
                                  <span className="text-[10px] text-neutral-600">{new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="features" className="mt-0">
                  {!showForm && (
                    <Button onClick={() => setShowForm(true)} size="sm" className="mb-4 bg-purple-600 hover:bg-purple-500 text-white text-xs w-full">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Request a Feature
                    </Button>
                  )}
                  {showForm && (
                    <div className="mb-4 p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                      <Input placeholder="Feature title" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white text-sm placeholder:text-neutral-600 h-9" />
                      <Textarea placeholder="Describe the feature you'd like..." value={formDesc} onChange={e => setFormDesc(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white text-sm placeholder:text-neutral-600 min-h-[80px]" />
                      <div className="flex gap-2">
                        <Button onClick={handleSubmitFeature} disabled={submitting || !formTitle.trim() || !formDesc.trim()} size="sm" className="bg-purple-600 hover:bg-purple-500 text-white text-xs flex-1">
                          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit"}
                        </Button>
                        <Button onClick={() => { setShowForm(false); setFormTitle(""); setFormDesc("") }} variant="outline" size="sm" className="text-xs border-neutral-700 text-neutral-400 hover:bg-neutral-800">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  {features.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-8">No feature requests yet. Be the first!</p>
                  ) : (
                    <div className="space-y-3">
                      {features.map((feature) => (
                        <div key={feature.id} className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/60 hover:border-neutral-700/60 transition-colors">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleVote(feature.id, !!feature.has_voted)}
                              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-colors min-w-[44px] ${feature.has_voted ? "bg-purple-500/10 border-purple-500/30 text-purple-400" : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"}`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span className="text-xs font-semibold">{feature.upvotes}</span>
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">{feature.title}</span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${statusConfig[feature.status] || ""}`}>
                                  {feature.status.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-xs text-neutral-400 leading-relaxed">{feature.description}</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <Clock className="w-3 h-3 text-neutral-600" />
                                <span className="text-[10px] text-neutral-600">{new Date(feature.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="bugs" className="mt-0">
                  {!showForm && (
                    <Button onClick={() => setShowForm(true)} size="sm" className="mb-4 bg-red-600 hover:bg-red-500 text-white text-xs w-full">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Report a Bug
                    </Button>
                  )}
                  {showForm && (
                    <div className="mb-4 p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                      <Input placeholder="Bug title" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white text-sm placeholder:text-neutral-600 h-9" />
                      <Textarea placeholder="Describe the bug, steps to reproduce..." value={formDesc} onChange={e => setFormDesc(e.target.value)} className="bg-neutral-900 border-neutral-700 text-white text-sm placeholder:text-neutral-600 min-h-[80px]" />
                      <div className="flex gap-2">
                        {(["low", "medium", "high", "critical"] as const).map(s => (
                          <button key={s} onClick={() => setFormSeverity(s)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${formSeverity === s ? severityConfig[s] : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-600"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSubmitBug} disabled={submitting || !formTitle.trim() || !formDesc.trim()} size="sm" className="bg-red-600 hover:bg-red-500 text-white text-xs flex-1">
                          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Bug Report"}
                        </Button>
                        <Button onClick={() => { setShowForm(false); setFormTitle(""); setFormDesc(""); setFormSeverity("medium") }} variant="outline" size="sm" className="text-xs border-neutral-700 text-neutral-400 hover:bg-neutral-800">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  {bugs.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-8">No bug reports yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {bugs.map((bug) => (
                        <div key={bug.id} className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/60 hover:border-neutral-700/60 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg border ${severityConfig[bug.severity as keyof typeof severityConfig] || ""} mt-0.5`}>
                              <Bug className={`w-3.5 h-3.5`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-sm font-medium text-white">{bug.title}</span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${severityConfig[bug.severity as keyof typeof severityConfig] || ""}`}>
                                  {bug.severity}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${statusConfig[bug.status] || ""}`}>
                                  {bug.status.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-xs text-neutral-400 leading-relaxed">{bug.description}</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <Clock className="w-3 h-3 text-neutral-600" />
                                <span className="text-[10px] text-neutral-600">{new Date(bug.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
