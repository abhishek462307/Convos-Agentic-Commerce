"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Bot,
  TrendingUp,
  Upload,
  FileSpreadsheet,
  Package,
  Check,
  Sliders,
  MessageSquare,
  DollarSign,
  Users,
  ArrowUpRight,
  BarChart3,
  Zap,
  Globe,
} from "lucide-react";
import ScrollFloat from "@/components/ui/scroll-float";
import CountUp from "@/components/ui/count-up";

 
const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

 
const itemFade: any = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

 
const progressFill = (width: string, delay: number): any => ({
  hidden: { width: "0%" },
  visible: { width, transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay } },
});

export default function HowItWorks() {
  return (
      <section id="how-it-works" className="relative py-16 sm:py-16 md:py-40 bg-black overflow-hidden">
        <div className="container relative z-10 px-4 sm:px-4 md:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-20">
              <ScrollFloat
                className="text-balance relative z-20 mx-auto mb-4 max-w-4xl text-2xl sm:text-3xl md:text-6xl font-semibold tracking-tight leading-tight text-white"
            >Launch your agentic store</ScrollFloat>
            <p className="max-w-lg text-sm md:text-base text-center mx-auto mt-4 text-[#737373]">
              Three steps to go from zero to a fully autonomous AI-powered storefront.
            </p>
        </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-4 auto-rows-auto lg:auto-rows-[30rem] px-0 sm:px-0">
          {/* Step 1 - Connect Your Store */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            custom={0}
            className="group rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden flex flex-col relative justify-between lg:col-span-3 p-5 sm:p-6 md:p-8 hover:border-[#2a2a2a] transition-colors duration-500"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-white/80" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25">Step 01</span>
                </div>
                  <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                    Add Your<br />Products
                  </h3>
                  <p className="font-sans max-w-sm text-[13px] font-normal leading-relaxed mt-3 text-[#737373]">
                    Import your catalog from Shopify, WooCommerce, or upload a CSV. AI indexes and structures everything instantly.
                  </p>
              </div>
              <div className="flex items-center gap-1.5 bg-purple-500/[0.08] border border-purple-500/15 px-3 py-1.5 rounded-full">
                  <Zap className="w-3 h-3 text-purple-400" />
                  <span className="text-purple-400 text-[13px] font-semibold">Instant</span>
              </div>
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-auto"
            >
              <div className="rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] p-5 overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/15 flex items-center justify-center">
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white/70">Product Import</p>
                    <p className="text-[10px] text-[#555]">3 sources connected</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                      { name: "Shopify", icon: Package, count: "2,847 products", status: "synced", color: "purple" },
                      { name: "WooCommerce", icon: Globe, count: "1,203 products", status: "synced", color: "purple" },
                      { name: "catalog_q4.csv", icon: FileSpreadsheet, count: "486 products", status: "indexing", color: "pink" },
                  ].map((source, i) => (
                    <motion.div
                      key={source.name}
                      variants={itemFade}
                      className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                          <source.icon className="w-3.5 h-3.5 text-white/40" />
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-white/70">{source.name}</p>
                          <p className="text-[10px] text-[#555]">{source.count}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${source.color === "purple" ? "bg-purple-500/[0.08]" : "bg-pink-500/[0.08]"}`}>
                          {source.color === "purple" ? (
                            <Check className="w-2.5 h-2.5 text-purple-400" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                          )}
                          <span className={`text-[10px] font-medium ${source.color === "purple" ? "text-purple-400/80" : "text-pink-400/80"}`}>
                          {source.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      <span className="text-[10px] text-purple-400/60">4,536 products indexed</span>
                  </div>
                  <motion.div
                    className="h-1.5 w-32 rounded-full bg-white/[0.04] overflow-hidden"
                  >
                    <motion.div
                      variants={progressFill("92%", 0.6)}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-400"
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Step 2 - Configure Your AI */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            custom={1}
            className="group rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden flex flex-col relative justify-between lg:col-span-2 p-5 sm:p-6 md:p-8 hover:border-[#2a2a2a] transition-colors duration-500"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[240px] h-[240px]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full border border-white/[0.03] animate-[spin_25s_linear_infinite]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full border border-white/[0.05] animate-[spin_18s_linear_infinite_reverse]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full border border-white/[0.03]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-500/40 blur-sm" />

                <div className="absolute top-0 left-1/2 -ml-4 w-8 h-8 bg-[#141414] border border-white/[0.08] rounded-lg flex items-center justify-center">
                  <Sliders className="w-3.5 h-3.5 text-white/60" />
                </div>
                <div className="absolute bottom-6 right-2 w-8 h-8 bg-[#141414] border border-white/[0.08] rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-white/60" />
                </div>
                <div className="absolute top-1/2 left-0 -mt-4 w-8 h-8 bg-[#141414] border border-white/[0.08] rounded-lg flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-violet-400/70" />
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white/80" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25">Step 02</span>
              </div>
                <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                  Train Your<br />AI Agent
                </h3>
                <p className="font-sans max-w-[260px] text-[13px] font-normal leading-relaxed mt-3 text-[#737373]">
                  Set your brand voice, pricing rules, negotiation limits, and sales personality. The agent learns your business.
                </p>
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative z-10 mt-auto space-y-3"
            >
              {[
                  { label: "Brand Voice", value: "Friendly & Professional", pct: "88%", width: "88%", color: "from-purple-500 to-pink-500" },
                  { label: "Price Flexibility", value: "Up to 15% discount", pct: "72%", width: "72%", color: "from-purple-400 to-fuchsia-400" },
                  { label: "Negotiation Style", value: "Balanced", pct: "65%", width: "65%", color: "from-pink-500 to-rose-400" },
              ].map((item, i) => (
                <motion.div key={item.label} variants={itemFade} className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-white/50 uppercase tracking-[0.1em]">{item.label}</span>
                    <span className="text-[10px] text-white/30">{item.pct}</span>
                  </div>
                  <p className="text-[11px] text-white/70 font-medium mb-2">{item.value}</p>
                  <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div
                      variants={progressFill(item.width, 0.4 + i * 0.15)}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                    />
                  </div>
                </motion.div>
              ))}

              <div className="flex items-center gap-1.5 pt-1">
                {["Tone", "Rules", "Limits"].map((tag) => (
                  <span key={tag} className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Step 3 - Full width */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          custom={2}
            className="mt-4 sm:mt-4 group rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden relative hover:border-[#2a2a2a] transition-colors duration-500"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="p-6 md:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white/80" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/25">Step 03</span>
                </div>
                  <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                    Go Live &<br />Scale Autonomously
                  </h3>
                  <p className="font-sans max-w-md text-[13px] font-normal leading-relaxed mt-3 text-[#737373]">
                    Your store goes live with AI agents handling every customer. Monitor real-time analytics and watch revenue grow without lifting a finger.
                  </p>
              </div>

              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="mt-6 md:mt-8 grid grid-cols-2 gap-2"
              >
                  {[
                    { label: "Conversion Rate", value: 12.4, suffix: "%", change: "+3.2%", icon: ArrowUpRight, decimals: 1 },
                    { label: "Avg. Order Value", value: 87.5, prefix: "$", suffix: "", change: "+$12", icon: DollarSign, decimals: 2 },
                    { label: "AI Sessions", value: 14289, suffix: "", change: "+28%", icon: Users, decimals: 0 },
                    { label: "Revenue", value: 182, prefix: "$", suffix: "k", change: "+41%", icon: BarChart3, decimals: 0 },
                  ].map((stat) => (
                    <motion.div
                      key={stat.label}
                      variants={itemFade}
                      className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-2.5 sm:px-3 md:px-4 py-2.5 sm:py-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-white/40 uppercase tracking-[0.1em]">{stat.label}</span>
                        <stat.icon className="w-3 h-3 text-white/20" />
                      </div>
                      <p className="text-lg md:text-xl font-bold text-white leading-none">
                        <CountUp from={0} to={stat.value} prefix={stat.prefix || ""} suffix={stat.suffix} decimals={stat.decimals} duration={2.5} />
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <ArrowUpRight className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-[10px] font-semibold text-emerald-400">{stat.change}</span>
                      </div>
                    </motion.div>
                ))}
              </motion.div>

              <button className="mt-6 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[13px] font-medium hover:from-purple-400 hover:to-pink-400 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.2)] w-fit">
                Launch Your Store
              </button>
            </div>

            <div className="p-6 md:p-8 lg:border-l border-t lg:border-t-0 border-[#1a1a1a] flex flex-col justify-center">
              <div className="rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] p-5 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="text-[10px] font-semibold text-purple-400/80 uppercase tracking-[0.15em]">Live Dashboard</span>
                  </div>
                  <span className="text-[10px] text-[#555]">Last 30 days</span>
                </div>

                <div className="h-[120px] sm:h-[160px] flex items-end gap-[3px] sm:gap-[5px] mb-4">
                  {[
                      { h: 18, color: "from-purple-900/60 to-purple-500/40" },
                      { h: 28, color: "from-purple-900/60 to-purple-400/50" },
                      { h: 22, color: "from-purple-800/60 to-purple-400/50" },
                      { h: 38, color: "from-purple-700/60 to-fuchsia-400/50" },
                      { h: 32, color: "from-purple-600/50 to-fuchsia-400/50" },
                      { h: 48, color: "from-purple-600/50 to-pink-400/50" },
                      { h: 42, color: "from-purple-500/50 to-pink-400/50" },
                      { h: 55, color: "from-fuchsia-500/50 to-pink-400/50" },
                      { h: 50, color: "from-fuchsia-500/50 to-pink-400/50" },
                      { h: 62, color: "from-pink-600/50 to-pink-400/50" },
                      { h: 58, color: "from-pink-600/50 to-pink-300/50" },
                      { h: 72, color: "from-pink-500/50 to-pink-300/60" },
                      { h: 68, color: "from-pink-500/50 to-rose-300/60" },
                      { h: 78, color: "from-pink-400/50 to-rose-300/60" },
                      { h: 85, color: "from-pink-400/50 to-rose-300/60" },
                      { h: 92, color: "from-pink-400/60 to-rose-300/70" },
                  ].map((bar, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${bar.h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.4 + i * 0.05 }}
                      className={`flex-1 bg-gradient-to-t ${bar.color} rounded-t-[3px]`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-400" />
                        <span className="text-[10px] text-white/40">Sessions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-400" />
                        <span className="text-[10px] text-white/40">Revenue</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-purple-500/[0.08] px-2 py-1 rounded-md">
                      <ArrowUpRight className="w-2.5 h-2.5 text-purple-400" />
                      <span className="text-[10px] font-semibold text-purple-400">+41%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  { label: "Uptime", value: "99.9%" },
                  { label: "Avg Response", value: "0.8s" },
                  { label: "CSAT Score", value: "4.9/5" },
                ].map((metric) => (
                  <div key={metric.label} className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-3 text-center">
                    <p className="text-[10px] text-[#555] uppercase tracking-[0.1em] font-medium mb-1">{metric.label}</p>
                    <p className="text-sm font-bold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
