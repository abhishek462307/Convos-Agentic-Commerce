"use client";

import React, { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  HeroHighlight, 
  Highlight, 
  LampContainer, 
  BentoGrid, 
  BentoGridItem, 
  SparklesCore,
  BackgroundBeams,
  BackgroundBeamsWithCollision,
  TextGenerateEffect,
  Spotlight,
  AuroraBackground,
  FlipWords
} from "@/components/ui/aceternity";
import { 
  Bot, 
  Zap, 
  TrendingUp, 
  Globe, 
  Shield, 
  Rocket, 
  ArrowRight,
  BarChart3,
  MessageSquare,
  DollarSign,
  Users,
  BrainCircuit,
  Target,
  Workflow,
  CheckCircle2,
  XCircle,
  Mic,
  Coins,
  Search,
  ShoppingCart,
  Layers,
  Repeat,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
};

const VoiceVisualizer = () => (
  <div className="flex flex-1 w-full h-full min-h-[10rem] rounded-xl bg-neutral-900 border border-white/5 items-center justify-center p-8 overflow-hidden relative group/voice">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent opacity-0 group-hover/voice:opacity-100 transition-opacity duration-700" />
    <div className="relative z-10 flex flex-col items-center gap-6">
      <div className="relative">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl"
        />
        <div className="h-20 w-20 rounded-full bg-zinc-800 border border-purple-500/30 flex items-center justify-center relative z-10">
          <Mic className="w-8 h-8 text-purple-500" />
        </div>
      </div>
      <div className="flex gap-1 items-end h-12">
        {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.5, 0.3].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: "10%" }}
            animate={{ height: [`${h * 100}%`, `${(1 - h) * 100}%`, `${h * 100}%`] }}
            transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: i * 0.05 }}
            className="w-1.5 bg-gradient-to-t from-purple-600 to-purple-400 rounded-full"
          />
        ))}
      </div>
      <div className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] animate-pulse">Listening...</div>
    </div>
  </div>
);

const NegotiationLive = () => (
  <div className="flex flex-1 w-full h-full min-h-[10rem] rounded-xl bg-neutral-900 border border-white/5 p-6 flex-col gap-4 overflow-hidden relative group/neg">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Auction</span>
      </div>
      <div className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">AGENT ACTIVE</div>
    </div>
    
    <div className="space-y-3">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500 font-medium">Merchant Ask</span>
        <span className="text-white font-mono">$599.00</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: "100%" }}
          animate={{ width: "72%" }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          className="h-full bg-emerald-500"
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500 font-medium">Agent Bid</span>
        <span className="text-emerald-500 font-mono font-bold">$429.00</span>
      </div>
    </div>

    <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
      <div className="flex gap-2">
        <div className="h-4 w-4 rounded bg-purple-500/10 flex items-center justify-center shrink-0">
          <Bot className="w-2.5 h-2.5 text-purple-500" />
        </div>
        <div className="h-2 w-32 bg-zinc-800 rounded-full self-center" />
      </div>
      <div className="flex gap-2 opacity-50">
        <div className="h-4 w-4 rounded bg-zinc-800 flex items-center justify-center shrink-0">
          <ShoppingCart className="w-2.5 h-2.5 text-zinc-600" />
        </div>
        <div className="h-2 w-24 bg-zinc-800 rounded-full self-center" />
      </div>
    </div>
  </div>
);

const TrustScoreVisual = () => (
  <div className="flex flex-1 w-full h-full min-h-[10rem] rounded-xl bg-neutral-900 border border-white/5 p-6 flex-col items-center justify-center relative overflow-hidden group/trust">
    <div className="absolute top-0 right-0 p-4">
      <Globe className="w-20 h-20 text-blue-500/5 -mr-10 -mt-10" />
    </div>
    <div className="relative">
      <svg className="w-32 h-32 transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="58"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-zinc-800"
        />
        <motion.circle
          cx="64"
          cy="64"
          r="58"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={364.4}
          initial={{ strokeDashoffset: 364.4 }}
          animate={{ strokeDashoffset: 364.4 * 0.12 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="text-blue-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white">98%</span>
        <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">Trust</span>
      </div>
    </div>
    <div className="mt-6 flex gap-4 w-full">
      <div className="flex-1 p-2 rounded-lg bg-white/5 border border-white/5 text-center">
        <div className="text-[8px] text-zinc-500 uppercase font-bold mb-1">Status</div>
        <div className="text-[10px] text-emerald-500 font-bold">ELITE</div>
      </div>
      <div className="flex-1 p-2 rounded-lg bg-white/5 border border-white/5 text-center">
        <div className="text-[8px] text-zinc-500 uppercase font-bold mb-1">Missions</div>
        <div className="text-[10px] text-white font-bold">124</div>
      </div>
    </div>
  </div>
);

const MissionTracker = () => (
  <div className="flex flex-1 w-full h-full min-h-[10rem] rounded-xl bg-neutral-900 border border-white/5 p-6 flex-col gap-6 overflow-hidden relative group/mission">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Rocket className="w-4 h-4 text-purple-500" />
        <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Active Mission: ALPHA-09</span>
      </div>
      <div className="h-6 w-12 bg-zinc-800 rounded-full border border-white/5 relative">
        <motion.div 
          animate={{ x: [0, 24, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-1 left-1 h-4 w-4 bg-purple-500 rounded-full"
        />
      </div>
    </div>

    <div className="relative space-y-4">
      {[
        { label: "Locating optimal merchant", status: "completed" },
        { label: "Negotiating wholesale pricing", status: "active" },
        { label: "Validating stock availability", status: "pending" }
      ].map((step, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className={cn(
            "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
            step.status === "completed" ? "bg-emerald-500/20 border-emerald-500/50" :
            step.status === "active" ? "bg-purple-500/20 border-purple-500/50 animate-pulse" :
            "bg-zinc-800 border-zinc-700"
          )}>
            {step.status === "completed" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
          </div>
          <span className={cn(
            "text-[10px] font-medium",
            step.status === "completed" ? "text-zinc-300" :
            step.status === "active" ? "text-white" :
            "text-zinc-600"
          )}>{step.label}</span>
        </div>
      ))}
      <div className="absolute left-2 top-4 bottom-2 w-[1px] bg-zinc-800 -z-10" />
    </div>

    <div className="mt-auto h-1 w-full bg-zinc-800 rounded-full">
      <motion.div 
        initial={{ width: "0%" }}
        animate={{ width: "65%" }}
        className="h-full bg-purple-500"
      />
    </div>
  </div>
);

const AgenticBridge = () => {
  const authKey = "mcp_live_2026_auth_token_8x9z";

  return (
    <div className="flex flex-1 w-full h-full min-h-[10rem] rounded-xl bg-neutral-900 border border-white/5 p-6 items-center justify-center overflow-hidden relative group/bridge">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent" />
      <div className="flex items-center gap-8 relative z-10">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-zinc-500" />
          </div>
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">ChatGPT</span>
        </div>
        
        <div className="flex flex-col items-center gap-1 w-32">
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent relative">
            <motion.div 
              animate={{ left: ["0%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 -translate-y-1/2 h-1 w-4 bg-purple-500 blur-[2px] rounded-full"
            />
          </div>
          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.2em] border-purple-500/30 text-purple-500 py-0.5">MCP ACTIVE</Badge>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)]">
            <Logo size="sm" />
          </div>
          <span className="text-[8px] font-bold text-purple-500 uppercase tracking-widest">Convos</span>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
        <span>Bearer: {authKey}</span>
        <span className="text-emerald-500">Encrypted</span>
      </div>
    </div>
  );
};

const NegotiationChart = () => (
  <div className="w-full h-16 relative mt-4">
    <svg viewBox="0 0 400 100" className="w-full h-full">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(168 85 247)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(168 85 247)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M 0 20 Q 50 15, 100 40 T 200 60 T 300 30 T 400 80"
        fill="none"
        stroke="rgb(168 85 247)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <motion.path
        d="M 0 20 Q 50 15, 100 40 T 200 60 T 300 30 T 400 80 L 400 100 L 0 100 Z"
        fill="url(#chartGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      />
      <motion.circle
        cx="400"
        cy="80"
        r="4"
        fill="rgb(168 85 247)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring" }}
      >
        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
      </motion.circle>
    </svg>
    <div className="absolute top-0 left-0 text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">Price Resistance</div>
    <div className="absolute bottom-0 right-0 text-[8px] text-purple-500 font-bold uppercase tracking-tighter">Deal Target Achieved</div>
  </div>
);

const TerminalProductCard = () => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 2.5 }}
    className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm relative overflow-hidden group"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="flex gap-4 relative z-10">
      <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
        <ShoppingCart className="w-8 h-8 text-zinc-500" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[8px] font-black text-purple-500 uppercase tracking-widest mb-0.5">Active Mission</div>
            <h5 className="text-xs font-bold text-white tracking-tight">Breville Precision Brewer</h5>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[8px] font-black text-emerald-500 uppercase">Saving $170</span>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-lg font-black text-white">$429.00</span>
          <span className="text-[10px] text-zinc-600 line-through mb-1">$599.00</span>
        </div>
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, delay: 3 }}
            className="h-full bg-gradient-to-r from-purple-500 to-emerald-500"
          />
        </div>
      </div>
    </div>
  </motion.div>
);

const TerminalInteraction = () => (
  <div className="w-full h-full bg-[#0d0d0d] font-mono text-[10px] md:text-xs p-6 relative overflow-hidden group/terminal">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <span className="h-2 w-2 rounded-full bg-red-500/50" />
        <span className="h-2 w-2 rounded-full bg-yellow-500/50" />
        <span className="h-2 w-2 rounded-full bg-green-500/50" />
        <span className="ml-2 opacity-50 uppercase tracking-widest text-[8px]">Agent Terminal v2.0.4</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <span className="text-purple-500">❯</span>
          <span className="text-zinc-300">init_mission --intent "buy_espresso_machine"</span>
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-emerald-500/80"
        >
          [OK] Analyzing consumer trust score... 0.98 (High)
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-zinc-500"
        >
          [WAIT] Contacting merchant agent: "BlueBottle_HQ"
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex gap-2"
        >
          <span className="text-purple-500">❯</span>
          <span className="text-zinc-300">negotiate --max_price 450 --strategy aggressive</span>
        </motion.div>
        
        <TerminalProductCard />
        <NegotiationChart />
      </div>
    </div>
    
    <div className="absolute bottom-4 right-6 flex items-center gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping" />
      <span className="text-[8px] font-bold text-purple-500 uppercase tracking-widest">Processing Intent</span>
    </div>
  </div>
);

const features = [
  {
    title: "Conversational Storefronts",
    description: "Multi-modal interfaces that support native voice and text interactions with zero latency.",
    header: <VoiceVisualizer />,
    className: "md:col-span-2",
    icon: <MessageSquare className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Autonomous Negotiation",
    description: "Proprietary bargain engine that handles price negotiations based on merchant constraints.",
    header: <NegotiationLive />,
    className: "md:col-span-1",
    icon: <Coins className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Unified Consumer Profile",
    description: "Shared platform intelligence that tracks trust scores and buying habits across the network.",
    header: <TrustScoreVisual />,
    className: "md:col-span-1",
    icon: <Users className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Agentic Missions",
    description: "Delegated shopping tasks where AI agents proactively hunt for deals and fulfill orders.",
    header: <MissionTracker />,
    className: "md:col-span-2",
    icon: <Rocket className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Agentic Bridge (MCP)",
    description: "Connect your store to the world's leading LLMs. Native tool connectivity for ChatGPT and Claude.",
    header: <AgenticBridge />,
    className: "md:col-span-3",
    icon: <Zap className="h-4 w-4 text-neutral-500" />,
  },
];

const DECK_ID = "agentic-future-2026";

const AccessRestricted = () => (
  <div className="h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
    <div className="relative z-10 text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-8"
      >
        <Lock className="w-8 h-8 text-red-500" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
      >
        Access Restricted
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-zinc-500 text-lg max-w-md mx-auto"
      >
        This content is confidential and only accessible via a direct link. Please contact the administrator for access.
      </motion.p>
    </div>
    <BackgroundBeams className="opacity-20" />
  </div>
);

export default function PitchDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  if (id !== DECK_ID) {
    return <AccessRestricted />;
  }

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }, []);

  return (
    <div className="dark bg-black text-white selection:bg-purple-500 selection:text-white font-sans overflow-x-hidden">
      {/* 1. Title Slide */}
      <section className="h-screen relative w-full overflow-hidden flex items-center justify-center bg-black">
        <ClientOnly>
          <div className="absolute inset-0 z-0">
            <SparklesCore
              id="hero-sparkles"
              background="transparent"
              minSize={0.4}
              maxSize={1.2}
              particleDensity={70}
              className="w-full h-full"
              particleColor="#FFFFFF"
            />
          </div>
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20 opacity-40" fill="purple" />
        </ClientOnly>
        
        <HeroHighlight containerClassName="dark:bg-black/50 bg-black/50" className="h-full w-full flex items-center justify-center">
            <div className="relative z-20 flex flex-col items-center px-4 max-w-[1600px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="mb-12"
            >
              <Logo size="lg" className="scale-125" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.4, 0.0, 0.2, 1] }}
              className="text-5xl md:text-8xl lg:text-9xl font-black text-white leading-[0.85] text-center tracking-tighter"
            >
              AGENTIC <br />
              <div className="mt-4">
                <FlipWords 
                  words={["COMMERCE", "INTELLIGENCE", "NEGOTIATION"]} 
                  className="text-purple-500"
                />
              </div>
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-12 text-center"
            >
              <p className="text-zinc-500 text-xl md:text-3xl font-light tracking-tight">
                Commerce that thinks, negotiates, and acts.
              </p>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-zinc-400 font-medium text-sm md:text-base uppercase tracking-[0.2em]">
                <span>Text</span>
                <span className="text-zinc-800">•</span>
                <span>Voice</span>
                <span className="text-zinc-800">•</span>
                <span>Negotiation</span>
                <span className="text-zinc-800">•</span>
                <span>Autonomous</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-600">The Shift is Coming</span>
              <div className="h-12 w-[1px] bg-gradient-to-b from-purple-500 to-transparent animate-pulse" />
            </motion.div>
          </div>
        </HeroHighlight>
      </section>

      {/* 2. The Problem */}
      <section className="py-40 relative overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 z-0">
          <BackgroundBeamsWithCollision className="h-full w-full opacity-20">
            <div className="hidden" />
          </BackgroundBeamsWithCollision>
        </div>
        
        <div className="max-w-[1600px] mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-24"
          >
            <h2 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter max-w-6xl leading-[1.1]">
              E-commerce is stuck in <br />
              <Highlight className="text-black inline-block mt-4">the 2010s.</Highlight>
            </h2>
            <p className="text-zinc-500 text-xl font-light tracking-tight max-w-2xl leading-relaxed">
              Today's "modern" shopping experience is actually a series of friction points that kill conversion and intent.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-12">
              <div className="relative pl-8 border-l border-zinc-800 space-y-12">
                {[
                  { label: "Phase 1: Discovery", text: "Users browse → filter → scroll → repeat.", icon: <Search className="w-5 h-5" />, color: "zinc" },
                  { label: "Phase 2: Friction", text: "Static catalogs with zero intent awareness.", icon: <Layers className="w-5 h-5" />, color: "zinc" },
                  { label: "Phase 3: Failure", text: "70%+ abandonment rate due to complexity.", icon: <XCircle className="w-5 h-5" />, color: "red" },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="relative"
                  >
                    <div className={cn(
                      "absolute -left-[41px] top-0 h-4 w-4 rounded-full border-4 border-zinc-950",
                      item.color === "red" ? "bg-red-500" : "bg-zinc-700"
                    )} />
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "p-2 rounded-lg bg-white/5 border border-white/10",
                        item.color === "red" ? "text-red-500" : "text-zinc-500"
                      )}>{item.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{item.label}</span>
                    </div>
                    <p className={cn(
                      "text-xl font-medium",
                      item.color === "red" ? "text-red-400" : "text-zinc-300"
                    )}>{item.text}</p>
                  </motion.div>
                ))}
              </div>

              <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-red-500/10 via-transparent to-transparent border border-red-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-6">
                  <div className="space-y-1">
                    <h4 className="text-6xl font-black text-red-500 tracking-tighter italic">70%+</h4>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Global Cart Abandonment</p>
                  </div>
                  <div className="h-20 w-[1px] bg-red-500/20 rotate-12" />
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-zinc-400 leading-relaxed italic">
                      "Humans are forced to do the work machines should do."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { 
                    title: "Zero Personalization", 
                    desc: "Beyond 'recommended products', Shopify knows nothing about real user intent.",
                    icon: <Users className="w-6 h-6" />,
                    className: "md:col-span-1"
                  },
                  { 
                    title: "No Negotiation", 
                    desc: "Static prices kill high-intent deals. Merchants lose customers after hours.",
                    icon: <Coins className="w-6 h-6" />,
                    className: "md:col-span-1"
                  },
                  { 
                    title: "The Memory Gap", 
                    desc: "Every session starts from zero. No persistent mission or goal awareness.",
                    icon: <BrainCircuit className="w-6 h-6" />,
                    className: "md:col-span-2"
                  }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "p-8 rounded-[2rem] bg-zinc-900/50 border border-white/5 hover:border-red-500/30 transition-all group",
                      item.className
                    )}
                  >
                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                      {item.icon}
                    </div>
                    <h4 className="text-2xl font-bold mb-3 tracking-tight">{item.title}</h4>
                    <p className="text-zinc-500 leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Shift That’s Coming */}
      <section className="py-40 bg-black relative overflow-hidden">
        <ClientOnly>
          <BackgroundBeams />
        </ClientOnly>
        <div className="max-w-[1600px] mx-auto px-4 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter leading-none">
              The Interface <br /> 
              <span className="text-purple-500">Evolution</span>
            </h2>
            <p className="text-zinc-500 text-xl font-light tracking-tight max-w-4xl mx-auto leading-relaxed">
              We are witnessing the most significant shift in human-computer interaction since the GUI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { year: "1995", label: "Browsers", icon: <Globe />, era: "The Page Era", desc: "Humans go to the information.", color: "zinc" },
              { year: "2005", label: "Search", icon: <Search />, era: "The Index Era", desc: "Humans find the information.", color: "zinc" },
              { year: "2015", label: "Feeds", icon: <TrendingUp />, era: "The Algorithm Era", desc: "Information finds the humans.", color: "zinc" },
              { year: "2023", label: "Chat", icon: <MessageSquare />, era: "The Interaction Era", desc: "Humans talk to the information.", color: "zinc" },
              { year: "2026", label: "Autonomous Agents", icon: <Bot />, era: "The Agency Era", desc: "Information acts for the humans.", color: "purple", highlight: true }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative p-8 rounded-[2.5rem] border transition-all duration-500 group h-full flex flex-col justify-between",
                  item.highlight 
                    ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_50px_-12px_rgba(168,85,247,0.4)]" 
                    : "bg-zinc-900/50 border-white/5 hover:border-white/10 text-zinc-400"
                )}
              >
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <span className={cn(
                        "text-[10px] font-black tracking-[0.3em] uppercase",
                        item.highlight ? "text-purple-200" : "text-zinc-600"
                      )}>{item.year}</span>
                      <div className={cn(
                        "p-3 rounded-2xl",
                        item.highlight ? "bg-white/20 text-white" : "bg-white/5 text-zinc-500"
                      )}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { className: "w-5 h-5" })}
                      </div>
                    </div>
                    
                    <h4 className={cn(
                      "text-2xl font-black tracking-tight mb-2",
                      item.highlight ? "text-white" : "text-white"
                    )}>{item.label}</h4>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-widest mb-4",
                      item.highlight ? "text-purple-200" : "text-zinc-500"
                    )}>{item.era}</p>
                  </div>

                  <p className={cn(
                    "text-sm leading-relaxed",
                    item.highlight ? "text-white/80" : "text-zinc-500"
                  )}>
                    {item.desc}
                  </p>
                </div>

                {i < 4 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 hidden md:block opacity-20 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="mt-20 p-12 rounded-[3rem] bg-zinc-900/30 border border-white/5 backdrop-blur-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Bot className="w-64 h-64 -mr-20 -mt-20" />
            </div>
            
            <div className="max-w-4xl relative z-10">
              <h3 className="text-3xl md:text-5xl font-black mb-8 tracking-tighter italic leading-tight text-white">
                "Find me the best deal <br /> and <Highlight className="text-black inline-block py-1">buy it for me."</Highlight>
              </h3>
              <div className="flex flex-col md:flex-row gap-12 items-start">
                <p className="text-zinc-500 text-xl font-light leading-relaxed flex-1">
                  In the Agency Era, commerce isn't about browsing pages. It's about <span className="text-white font-medium underline decoration-purple-500/50 underline-offset-4 decoration-2">delegating intent</span>.
                </p>
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 shrink-0">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] block mb-4">The Platform Reset</span>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Legacy</span>
                      <span className="text-zinc-400 line-through font-medium">Shopify: Pages</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                    <div className="flex flex-col">
                      <span className="text-purple-500 text-[10px] uppercase font-bold mb-1">Future</span>
                      <span className="text-white font-black">Convos: Agents</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. The Solution: Convos */}
      <section className="py-32 bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full" />
        </div>
        
        <div className="max-w-[1600px] mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping" />
                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">The Intelligence Layer</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-black mb-8 relative tracking-tighter leading-[1.1]">
                  A New Commerce <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">Primitive.</span>
                </h2>
                <p className="text-zinc-400 text-xl font-light leading-relaxed mb-12 max-w-xl">
                  Convos is an Agentic Commerce Platform that lets merchants run stores where <span className="text-white font-medium">AI agents sell, negotiate, and transact</span> with human-level intelligence.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: "Native Intelligence", desc: "Not a chatbot. Not a plugin.", icon: <BrainCircuit className="w-5 h-5" />, badge: "GPT-5.2" },
                    { title: "Multi-modal", desc: "Shop via text + voice seamlessly.", icon: <Mic className="w-5 h-5" />, badge: "Realtime" },
                    { title: "Intent Engine", desc: "Understands goals, not just keywords.", icon: <Target className="w-5 h-5" />, badge: "Autonomous" },
                    { title: "Infinite Memory", desc: "Persistent context across sessions.", icon: <Repeat className="w-5 h-5" />, badge: "Contextual" },
                    { title: "Consumer Matrix", desc: "Unified intelligence across stores.", icon: <Globe className="w-5 h-5" />, badge: "Global" }
                  ].map((feature, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {React.cloneElement(feature.icon as React.ReactElement<any>, { className: "text-purple-500 w-5 h-5" })}
                          </div>
                          {feature.badge && (
                            <span className="text-[8px] font-black text-purple-500/50 uppercase tracking-widest border border-purple-500/20 px-1.5 py-0.5 rounded">
                              {feature.badge}
                            </span>
                          )}
                        </div>
                        <h4 className="text-white font-bold mb-1 tracking-tight">{feature.title}</h4>
                        <p className="text-zinc-500 text-xs leading-relaxed">{feature.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-tr from-purple-500/20 to-emerald-500/20 blur-xl rounded-[2.5rem] opacity-50" />
              <div className="relative aspect-video rounded-[2.5rem] border border-white/10 bg-black overflow-hidden shadow-2xl group">
                <div className="absolute top-0 left-0 w-full p-5 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md flex justify-between items-center z-20">
                  <div className="flex items-center gap-3">
                    <Logo size="sm" />
                    <div className="h-4 w-[1px] bg-white/10" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Store Mission: #8492</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-6 px-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-500 uppercase">Agent Live</span>
                    </div>
                  </div>
                </div>
                <div className="h-full w-full pt-16">
                  <TerminalInteraction />
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-6 -right-6 p-6 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl hidden lg:block animate-bounce [animation-duration:3s]">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Status</div>
                    <div className="text-sm font-bold text-white">Negotiating Price...</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. Shopify vs Convos */}
      <section className="py-32 bg-black">
        <div className="max-w-[1600px] mx-auto px-4">
          <h2 className="text-4xl md:text-6xl font-bold mb-16 text-center tracking-tighter">Shopify vs <span className="text-purple-500">Convos</span></h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-[2rem] border border-white/5 bg-zinc-900/30">
               <h3 className="text-2xl font-bold mb-8 text-zinc-500 border-b border-white/5 pb-4">Shopify (Tools for Merchants)</h3>
               <div className="space-y-6">
                 {[
                   { label: "Interface", value: "Storefront pages" },
                   { label: "Context", value: "Static catalog" },
                   { label: "Pricing", value: "Coupons" },
                   { label: "Lifespan", value: "One-time sessions" },
                   { label: "Intelligence", value: "No memory" },
                   { label: "Action", value: "Manual buying" }
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center group">
                     <span className="text-zinc-600 font-bold uppercase text-[10px] tracking-widest">{item.label}</span>
                     <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors">{item.value}</span>
                   </div>
                 ))}
               </div>
            </div>
            <div className="p-8 rounded-[2rem] border border-purple-500/20 bg-purple-500/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                 <Zap className="w-6 h-6 text-purple-500" />
               </div>
               <h3 className="text-2xl font-bold mb-8 text-white border-b border-white/10 pb-4">Convos (Intelligence for Commerce)</h3>
               <div className="space-y-6">
                 {[
                   { label: "Interface", value: "Conversational storefronts" },
                   { label: "Context", value: "Intent-aware discovery" },
                   { label: "Pricing", value: "AI negotiation" },
                   { label: "Lifespan", value: "Persistent AI missions" },
                   { label: "Intelligence", value: "Unified Consumer Profile" },
                   { label: "Action", value: "Delegated buying" }
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center group">
                     <span className="text-purple-500 font-bold uppercase text-[10px] tracking-widest">{item.label}</span>
                     <span className="text-white group-hover:text-purple-300 transition-colors">{item.value}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Product Demo (Conceptual) */}
      <section className="py-32 bg-zinc-950 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="p-1 rounded-[3rem] bg-gradient-to-b from-white/10 to-transparent">
            <div className="bg-zinc-900 rounded-[2.9rem] p-12 overflow-hidden relative">
              <div className="space-y-8">
                <div className="flex flex-col gap-2 items-start max-w-[80%]">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User</span>
                  <div className="bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-white/5">
                    "I need a birthday gift under $50 by Friday"
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end ml-auto max-w-[80%]">
                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Convos AI Agent</span>
                  <div className="bg-purple-600 p-4 rounded-2xl rounded-tr-none border border-purple-400/20 text-white">
                    <p className="mb-4">Found 3 options. I've already negotiated the 'Pro Sampler' from $58 to $48 since you're a high-trust shopper.</p>
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-xs font-medium">
                         <CheckCircle2 className="w-4 h-4" /> Constraints met ($50, Friday delivery)
                       </div>
                       <div className="flex items-center gap-2 text-xs font-medium">
                         <CheckCircle2 className="w-4 h-4" /> Price negotiated (-$10)
                       </div>
                    </div>
                  </div>
                </div>
                <div className="pt-8 border-t border-white/5 flex justify-between items-center">
                   <div className="flex gap-4">
                     <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
                       <Mic className="w-5 h-5 text-zinc-400" />
                     </div>
                     <div className="h-10 px-4 rounded-full bg-white/5 flex items-center justify-center text-xs font-medium text-zinc-500">
                       Type a message...
                     </div>
                   </div>
                   <Button className="bg-white text-black rounded-full px-6 font-bold uppercase tracking-widest text-[10px]">Confirm Purchase</Button>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent pointer-events-none h-24 bottom-0" />
            </div>
          </div>
          <p className="text-center text-zinc-600 mt-12 text-sm font-light uppercase tracking-[0.4em]">Zero browsing. Zero friction.</p>
        </div>
      </section>

      {/* 7. Platform Features (Bento Grid) */}
      <section className="py-32 bg-black relative">
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-7xl font-bold mb-6 tracking-tighter">The Agentic <span className="text-purple-500">Toolkit</span></h2>
            <p className="text-zinc-500 text-xl font-light tracking-tight max-w-2xl mx-auto">
              A comprehensive platform built for the future of autonomous commerce.
            </p>
          </div>

          <BentoGrid className="max-w-[1600px] mx-auto">
            {features.map((feature, i) => (
              <BentoGridItem
                key={i}
                title={feature.title}
                description={feature.description}
                header={feature.header}
                className={cn("[&>p:text-lg]", feature.className)}
                icon={feature.icon}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* 8. Agentic Commerce (Moat) */}
      <section className="py-32 bg-zinc-950">
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tighter">AI-Operated <br /> Commerce</h2>
              <p className="text-zinc-400 text-xl font-light mb-12">
                Convos is evolving from AI-assisted to AI-operated. This is our core architecture, not a feature.
              </p>
              <div className="grid grid-cols-2 gap-8">
                {[
                  { title: "Plan", val: "Intent & Constraints", icon: <Layers /> },
                  { title: "Negotiate", val: "Multi-round bargaining", icon: <Repeat /> },
                  { title: "Act", val: "Payment & Fulfillment", icon: <ShoppingCart /> },
                  { title: "Optimize", val: "Learn from outcomes", icon: <TrendingUp /> }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2 text-purple-500">
                      {item.icon}
                      <span className="font-bold uppercase text-[10px] tracking-widest">{item.title}</span>
                    </div>
                    <p className="text-white font-medium">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
               <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-[120px]" />
               <div className="relative p-12 rounded-[3rem] border border-white/10 bg-black flex items-center justify-center">
                  <BrainCircuit className="w-40 h-40 text-purple-500 opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="h-64 w-64 border border-purple-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                     <div className="absolute h-80 w-80 border border-purple-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Why Shopify Can’t Do This */}
      <section className="py-32 bg-black overflow-hidden relative">
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <h2 className="text-4xl md:text-7xl font-bold tracking-tighter">The Platform <span className="text-purple-500">Reset.</span></h2>
            <p className="text-zinc-500 text-xl font-light italic max-w-sm border-l border-purple-500/50 pl-6">
              "This is a platform reset — not an iteration."
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
             {[
               { 
                 title: "Page-Centric", 
                 desc: "Shopify is built on Liquid templates and static URLs. Agentic loops break their architecture.",
                 icon: <Layers className="w-8 h-8 text-purple-500" />,
                 stat: "Legacy"
               },
                { 
                  title: "Stateless by Design", 
                  desc: "No native cross-session memory for agentic buying workflows. Adding a 'chat box' is just a facade.",
                  icon: <BrainCircuit className="w-8 h-8 text-purple-500" />,
                  stat: "Stateless"
                },
               { 
                 title: "Plugin Dependent", 
                 desc: "Fragmentation prevents the unified intelligence required for autonomous buying.",
                 icon: <Workflow className="w-8 h-8 text-purple-500" />,
                 stat: "Fragmented"
               }
             ].map((item, i) => (
               <div key={i} className="p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 flex flex-col justify-between h-[420px] group hover:border-purple-500/30 transition-all relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   {item.icon}
                 </div>
                 <div>
                   <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-8">
                     {item.icon}
                   </div>
                   <h4 className="text-3xl font-bold mb-4">{item.title}</h4>
                   <p className="text-zinc-500 leading-relaxed">{item.desc}</p>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="h-1 w-8 bg-purple-500/20 rounded-full overflow-hidden">
                     <div className="h-full w-1/3 bg-purple-500" />
                   </div>
                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{item.stat}</span>
                 </div>
               </div>
             ))}
          </div>
          <div className="mt-20 flex flex-col items-center gap-4">
            <p className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px]">Merchant-first vs Agent-first</p>
            <div className="px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-sm">
              Adding "AI chat" ≠ Agentic commerce.
            </div>
          </div>
        </div>
      </section>

      {/* 10. Target Customers */}
      <section className="py-32 bg-zinc-950">
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tighter">Market <span className="text-emerald-500">Expansion.</span></h2>
            <p className="text-zinc-500 uppercase tracking-[0.4em] text-[10px] font-black">Strategic GTM Roadmap</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                phase: "Phase 1", 
                title: "D2C Brands", 
                items: ["High-consideration products", "India + Global SMBs"],
                reach: "High Intent",
                color: "emerald"
              },
              { 
                phase: "Phase 2", 
                title: "Marketplaces", 
                items: ["Subscription commerce", "Services + digital goods"],
                reach: "Mass Scale",
                color: "blue"
              },
              { 
                phase: "Phase 3", 
                title: "AI-Native Brands", 
                items: ["Fully autonomous stores", "Agent-to-agent commerce"],
                reach: "Infinite Agency",
                color: "purple"
              }
            ].map((p, i) => (
              <div key={i} className="p-8 rounded-[2rem] border border-white/5 bg-zinc-900/50 relative group overflow-hidden">
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10",
                  p.color === "emerald" ? "bg-emerald-500" : p.color === "blue" ? "bg-blue-500" : "bg-purple-500"
                )} />
                <div className="flex justify-between items-start mb-12">
                  <span className={cn(
                    "font-bold uppercase text-[10px] tracking-widest border px-2 py-0.5 rounded",
                    p.color === "emerald" ? "text-emerald-500 border-emerald-500/20" : 
                    p.color === "blue" ? "text-blue-500 border-blue-500/20" : 
                    "text-purple-500 border-purple-500/20"
                  )}>{p.phase}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(dot => (
                      <div key={dot} className={cn(
                        "h-1 w-1 rounded-full",
                        dot <= i + 1 ? (p.color === "emerald" ? "bg-emerald-500" : p.color === "blue" ? "bg-blue-500" : "bg-purple-500") : "bg-zinc-800"
                      )} />
                    ))}
                  </div>
                </div>
                <h4 className="text-2xl font-bold mb-6 tracking-tight">{p.title}</h4>
                <div className="space-y-4 mb-12">
                  {p.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-3 text-zinc-400 text-sm">
                      <CheckCircle2 className={cn(
                        "w-4 h-4",
                        p.color === "emerald" ? "text-emerald-500" : p.color === "blue" ? "text-blue-500" : "text-purple-500"
                      )} />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-white/5 mt-auto">
                   <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Target Outcome</div>
                   <div className="text-white font-bold">{p.reach}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Business Model */}
      <section className="py-32 bg-black relative">
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tighter">Monetizing <br /> <span className="text-emerald-500">Intelligence.</span></h2>
              <div className="space-y-6">
                 {[
                   { title: "Self-Hosted License", desc: "Open-source deployment with no platform subscription requirement." },
                   { title: "AI Usage Fees", desc: "Provider-side compute and model costs in your own account." },
                   { title: "Optional Modules", desc: "Enable only the features your single-merchant deployment needs." },
                   { title: "Payments", desc: "Pay provider fees directly through your configured processors." }
                 ].map((item, i) => (
                   <div key={i} className="flex gap-4 group">
                     <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0 group-hover:scale-125 transition-transform" />
                     <div>
                        <h4 className="text-xl font-bold text-white mb-1">{item.title}</h4>
                        <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
            <div className="p-16 rounded-[3rem] border border-emerald-500/20 bg-emerald-500/5 text-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <DollarSign className="w-20 h-20 text-emerald-500 mx-auto mb-8 animate-pulse" />
               <p className="text-zinc-400 text-xl font-light">
                 Monetized on <span className="text-emerald-400 font-bold">intelligence</span>, <br /> not templates.
               </p>
               <div className="mt-8 flex justify-center gap-2">
                 {[1, 2, 3, 4, 5].map(i => (
                   <div key={i} className="h-1 w-4 bg-emerald-500/20 rounded-full" />
                 ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. Traction */}
      <section className="py-32 bg-zinc-950">
        <div className="max-w-[1600px] mx-auto px-4">
           <div className="text-center mb-20">
             <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tighter">Execution, Not <span className="text-purple-500">Speculation.</span></h2>
             <p className="text-zinc-500 text-sm font-medium uppercase tracking-[0.3em]">Fully Built Platform · Not MVP Slides</p>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {[
                    { label: "Fully built platform", icon: <Layers /> },
                    { label: "Merchant dashboard", icon: <BarChart3 /> },
                    { label: "Stripe payments live", icon: <Coins /> },
                    { label: "MCP Connectivity Live", icon: <Zap /> },
                    { label: "Search Console Native", icon: <Search /> },
                    { label: "Voice AI & Bargain Engine", icon: <Bot /> }
                  ].map((item, i) => (

                <div key={i} className="p-8 rounded-[2rem] bg-zinc-900 border border-white/5 flex flex-col items-center text-center gap-6 hover:border-purple-500/30 transition-all hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-purple-500">
                    {React.cloneElement(item.icon as React.ReactElement<any>, { className: "w-6 h-6" })}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-tight">{item.label}</span>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* 13. Market Opportunity */}
      <section className="py-32 bg-black relative overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-9xl font-black mb-6 tracking-tighter leading-none">$6T+</h2>
            <p className="text-zinc-500 text-xl md:text-2xl font-light mb-12 tracking-tight">Global E-commerce Opportunity</p>
            <div className="flex flex-wrap justify-center gap-4">
               {["Conversational AI Exploding", "Agentic Workflows", "The Interface Reset"].map((tag, i) => (
                 <div key={i} className="px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                   {tag}
                 </div>
               ))}
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4">
             {[
               { label: "Commerce", stat: "$6T Market", desc: "Expanding retail reach." },
               { label: "AI Agents", stat: "200% CAGR", desc: "Autonomous workflows." },
               { label: "Payments", stat: "Unified Flow", desc: "Agent-to-agent transactions." },
               { label: "Identity", stat: "UCP Matrix", desc: "Global trust scores." }
             ].map((item, i) => (
               <div key={i} className="p-8 rounded-[2.5rem] border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 transition-colors group">
                 <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4">{item.label}</div>
                 <div className="text-2xl font-bold mb-2 group-hover:text-purple-400 transition-colors">{item.stat}</div>
                 <p className="text-zinc-600 text-sm">{item.desc}</p>
               </div>
             ))}
          </div>
          <div className="mt-24 text-center">
            <p className="text-zinc-500 italic text-xl md:text-2xl font-light leading-relaxed max-w-2xl mx-auto">
              "Convos becomes <span className="text-white font-medium underline decoration-purple-500 underline-offset-8">infrastructure</span>, not just software."
            </p>
          </div>
        </div>
      </section>

      {/* 14. The Vision (10 Years) */}
      <section className="h-screen bg-black overflow-hidden flex items-center justify-center">
        <LampContainer>
          <motion.h1
            initial={{ opacity: 0.5, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
          >
            Humans don't shop. <br /> Agents shop for humans.
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-8 max-w-2xl mx-auto text-center space-y-6"
          >
            <p className="text-slate-500 text-lg leading-relaxed">
              AI agents represent buyers. Merchant agents represent sellers. <br />
              Negotiation happens machine-to-machine. <br />
              <span className="text-white font-medium">Humans step in only for intent & approval.</span>
            </p>
            <div className="inline-block px-4 py-1 rounded-full border border-purple-500/30 text-[10px] font-bold uppercase tracking-[0.5em] text-purple-500">
              The OS for Agentic Commerce
            </div>
          </motion.div>
        </LampContainer>
      </section>

      {/* 15. Why Now */}
      <section className="py-32 bg-zinc-950">
        <div className="max-w-[1600px] mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-7xl font-bold mb-4 tracking-tighter">Why Now?</h2>
            <p className="text-zinc-500 italic font-light text-xl">The next Shopify will not look like Shopify.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: "LLM Readiness", desc: "Models are finally good enough for autonomous agency.", icon: <BrainCircuit /> },
              { title: "Voice Maturity", desc: "Latency and naturalness have reached human levels.", icon: <Mic /> },
              { title: "Financial Trust", desc: "Users are ready to trust AI with wallets and agency.", icon: <Shield /> },
              { title: "UX Decay", desc: "Shopify-era 'pages' are failing to convert modern users.", icon: <XCircle /> }
            ].map((item, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all group">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {React.cloneElement(item.icon as React.ReactElement<any>, { className: "w-6 h-6 text-purple-500" })}
                </div>
                <h4 className="text-xl font-bold mb-3 tracking-tight text-white">{item.title}</h4>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 16. Closing */}
      <section className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-black">
        <ClientOnly>
          <AuroraBackground className="w-full h-full">
            <div className="w-full flex flex-col items-center justify-center py-20">
              <div className="max-w-[1600px] mx-auto text-center relative z-10 px-4 flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, type: "spring" }}
                className="mb-8 inline-block"
              >
                <div className="relative group">
                  <div className="absolute -inset-8 bg-purple-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <Logo size="md" className="scale-125 relative z-10" />
                </div>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl md:text-8xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-[0.8] uppercase"
              >
                Replacing the <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-emerald-400 animate-pulse">
                  Interface.
                </span>
              </motion.h2>

              <div className="max-w-4xl mx-auto mb-12">
                <TextGenerateEffect 
                  words="Convos is not competing with Shopify today. We are building what comes after it."
                  className="text-zinc-400 text-xl md:text-3xl font-light italic leading-tight"
                />
              </div>
              
              <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 mb-16 w-full max-w-5xl">
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex-1 p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3 group hover:bg-white/[0.05] transition-colors"
                >
                  <div className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em]">The Evolution</div>
                  <div className="text-xl font-bold text-zinc-400 group-hover:text-white transition-colors">
                    Pages <span className="text-zinc-800 mx-1">→</span> 
                    Conversations <span className="text-zinc-800 mx-1">→</span> 
                    <span className="text-purple-500">Agents</span>
                  </div>
                </motion.div>

                <div className="flex items-center justify-center opacity-20">
                  <div className="h-10 w-[1px] bg-white hidden md:block" />
                  <div className="w-10 h-[1px] bg-white md:hidden" />
                </div>

                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex-1 p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3 group hover:bg-white/[0.05] transition-colors"
                >
                  <div className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em]">The Platform</div>
                  <div className="text-xl font-bold text-zinc-400 group-hover:text-white transition-colors">
                    Shopify <span className="text-zinc-800 mx-1">→</span> 
                    <span className="text-purple-500 font-black">Convos</span>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col items-center gap-6"
              >
                <Button size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-full px-12 h-16 font-black text-xl group transition-all duration-500 transform hover:scale-110 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                  Join the Future <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </Button>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.4em] animate-pulse">
                  We’re not adding AI to commerce. We’re replacing the interface entirely.
                </p>
                </motion.div>
              </div>
            </div>
          </AuroraBackground>
          <div className="absolute inset-0 z-0 pointer-events-none">
            <SparklesCore
              id="pitch-sparkles-final"
              background="transparent"
              minSize={0.4}
              maxSize={1.4}
              particleDensity={40}
              particleColor="#8b5cf6"
              className="w-full h-full opacity-30"
            />
          </div>
        </ClientOnly>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/5 bg-black">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
           <Logo size="sm" className="opacity-40 grayscale" />
           <p className="text-zinc-600 text-[10px] tracking-[0.4em] uppercase font-bold text-center md:text-left">
             © 2026 Convos Platform · Strictly Confidential
           </p>
           <div className="flex gap-6 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
             <span className="hover:text-zinc-400 cursor-pointer transition-colors">Investor Relations</span>
             <span className="hover:text-zinc-400 cursor-pointer transition-colors">Privacy</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
