"use client";

import React from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import { 
  Rocket, 
  Cpu, 
  Globe, 
  Zap, 
  Users, 
  ArrowUpRight, 
  Sparkles,
  Bot,
  ShieldCheck,
  Star,
  ChevronRight,
  Layers,
  Activity,
  CreditCard,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LightRays from "@/components/ui/light-rays";
import GradientText from "@/components/ui/gradient-text";
import ScrollFloat from "@/components/ui/scroll-float";
import SpotlightCard from "@/components/ui/spotlight-card";
import Link from "next/link";

const startups = [
  {
    name: "Vesper",
    description: "Autonomous luxury curation. Vesper uses agentic intelligence to craft deeply personal shopping experiences for high-end fashion, moving beyond simple recommendations to true style partnership.",
    tag: "Luxury Commerce",
    icon: <Sparkles className="w-6 h-6 text-purple-400" />,
    stats: "+45% AOV Lift",
    color: "rgba(168, 85, 247, 0.15)"
  },
  {
    name: "Nodal",
    description: "The orchestration layer for distributed commerce. Nodal synchronizes inventory, pricing, and intent across infinite digital touchpoints in real-time using our proprietary Intent Stream.",
    tag: "Infrastructure",
    icon: <Layers className="w-6 h-6 text-blue-400" />,
    stats: "Sub-50ms Latency",
    color: "rgba(59, 130, 246, 0.15)"
  },
  {
    name: "Relay",
    description: "Instant, voice-first logistics for the final mile. Relay agents negotiate delivery windows and handle complex fulfillment workflows automatically via the Convos Voice AI stack.",
    tag: "Logos/Logistics",
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    stats: "92% Auto-Resolution",
    color: "rgba(234, 179, 8, 0.15)"
  },
  {
    name: "Arc",
    description: "Generative brand worlds. Arc allows merchants to deploy persistent AI entities that manage entire digital storefronts, from visual merchandising to real-time customer support.",
    tag: "Generative AI",
    icon: <Bot className="w-6 h-6 text-green-400" />,
    stats: "24/7 Global Presence",
    color: "rgba(34, 197, 94, 0.15)"
  },
  {
    name: "Flux",
    description: "Dynamic liquidity for agent-to-agent transactions. Flux provides the financial rails for autonomous shopping missions to execute secure payments on behalf of consumers.",
    tag: "FinTech",
    icon: <CreditCard className="w-6 h-6 text-pink-400" />,
    stats: "Zero-Knowledge Auth",
    color: "rgba(236, 72, 153, 0.15)"
  },
];

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

export default function ConvosLabsPage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased overflow-x-hidden">
      <Navigation />
      
      <main className="relative">
        {/* Hero Section */}
        <section className="relative flex min-h-[90dvh] flex-col items-center justify-center overflow-hidden px-6 pt-64 pb-20">
          <div className="absolute inset-0 z-0 bg-black" />

          <LightRays
            raysOrigin="top-center"
            raysColor="#a855f7"
            raysSpeed={1.4}
            lightSpread={1.2}
            rayLength={3.5}
            followMouse={true}
            mouseInfluence={0.08}
            noiseAmount={0.2}
            distortion={0}
            pulsating={true}
            fadeDistance={1.8}
            saturation={0.8}
          />

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] md:w-[900px] h-[300px] sm:h-[400px] md:h-[700px] opacity-30 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.35) 0%, rgba(236, 72, 153, 0.2) 35%, rgba(192, 38, 211, 0.1) 55%, transparent 75%)",
              filter: "blur(100px)",
            }}
          />

          <div className="relative z-20 flex flex-col items-center text-center max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/[0.08] text-[13px] text-white/90 hover:bg-purple-500/[0.14] transition-all mb-8 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
              <span className="flex h-5 items-center gap-1 px-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[10px] font-bold text-white tracking-wide uppercase">
                <Rocket className="h-2.5 w-2.5" />
                Venture
              </span>
              <span className="font-semibold">Convos Labs Startup Studio</span>
              <ChevronRight className="h-3.5 w-3.5 text-purple-400/60" />
            </motion.div>
            
            <GradientText
              colors={["#a855f7", "#ec4899", "#f97316", "#ec4899", "#a855f7"]}
              animationSpeed={8}
              className="text-5xl md:text-8xl lg:text-[7rem] font-bold tracking-tight leading-none mb-6"
            >
              Building the <em>Agentic</em> Future
            </GradientText>
            
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
            >
              The first venture studio dedicated exclusively to the autonomous commerce stack. We build companies that leverage our AI core to redefine retail.
            </motion.p>
            
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row gap-5 justify-center"
            >
              <Link href="/labs/apply">
                <Button size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-full px-10 h-14 text-base font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                  Apply for Cohort &apos;26
                </Button>
              </Link>
              <Link href="/labs/manifesto">
                <Button size="lg" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full px-10 h-14 text-base font-bold backdrop-blur-md transition-all duration-300 w-full sm:w-auto">
                  Read the Manifesto
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Studio Pillars Section */}
        <section className="px-6 py-32 relative bg-black">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Cpu, title: "Proprietary Core", desc: "Direct integration with the Convos Intent Stream and Consumer Matrix for instant AI capabilities.", color: "purple" },
                { icon: Users, title: "Expert Guidance", desc: "Weekly 1-on-1s with our core engineering team and seasoned retail founders to navigate the agentic commerce stack.", color: "blue" },
                { icon: Zap, title: "Cloud & AI Credits", desc: "Up to $250k in credits from Microsoft Azure, OpenAI, and Anthropic (Claude) to scale your compute needs.", color: "yellow" },
                { icon: Activity, title: "Rapid Deployment", desc: "Go from concept to first merchant pilot in less than 90 days with our pre-built infrastructure and design partners.", color: "green" }
              ].map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                  className="relative group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-${pillar.color}-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 border border-white/5`}>
                    <pillar.icon className={`w-6 h-6 text-${pillar.color}-400`} />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white tracking-tight">{pillar.title}</h3>
                  <p className="text-zinc-500 leading-relaxed font-light text-base">
                    {pillar.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* The Convos Layer Section */}
        <section className="px-6 py-24 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400 mb-8"
            >
              <Layers className="w-3 h-3" />
              <span>Incentive Program</span>
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
              Build on the <span className="text-purple-400 italic">Convos Layer</span>
            </h2>
            <p className="text-lg text-zinc-400 mb-12 font-light leading-relaxed">
              We provide extra equity incentives and direct seed investment for teams building native protocols on top of the Convos agentic layer. Whether it&apos;s a new settlement protocol or a specialized intent-processing engine, we want you to be part of the core ecosystem.
            </p>
            <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
              {/* Using text for logos for now as per design aesthetic */}
              <span className="text-xl font-bold tracking-tighter text-white">Microsoft</span>
              <span className="text-xl font-bold tracking-tighter text-white">OpenAI</span>
              <span className="text-xl font-bold tracking-tighter text-white">Anthropic</span>
              <span className="text-xl font-bold tracking-tighter text-white">Claude</span>
            </div>
          </div>
        </section>

        {/* Portfolio Section */}
        <section className="px-6 py-32">
          <div className="max-w-7xl mx-auto">
            <div className="mb-24 text-center">
              <ScrollFloat className="text-4xl md:text-6xl font-bold text-white mb-6">
                The 2026 Portfolio
              </ScrollFloat>
              <p className="text-zinc-500 max-w-xl mx-auto text-lg font-light">
                Visionary companies redefining the boundaries of agentic intelligence and commerce.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {startups.map((startup, index) => (
                <motion.div
                  key={startup.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={index}
                >
                  <SpotlightCard 
                    className="h-full p-8 rounded-[32px] bg-[#0A0A0A] border border-[#1F1F1F] hover:border-[#2a2a2a] transition-all duration-500 group flex flex-col"
                    spotlightColor={startup.color}
                  >
                    <div className="flex items-center justify-between mb-10">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/[0.08] group-hover:scale-110 transition-transform duration-500 shadow-xl">
                        {startup.icon}
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        {startup.tag}
                      </span>
                    </div>
                    
                    <div className="flex-grow">
                      <h3 className="text-3xl font-bold text-white mb-4 flex items-center gap-2 group-hover:text-purple-300 transition-colors duration-300">
                        {startup.name}
                        <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 -translate-y-1 translate-x-1 transition-all duration-500" />
                      </h3>
                      <p className="text-zinc-400 text-base leading-relaxed mb-10 font-light">
                        {startup.description}
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-600 uppercase tracking-tighter">Core KPI</span>
                      <span className="text-sm font-bold text-white/90 group-hover:text-purple-400 transition-colors">{startup.stats}</span>
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))}
              
              {/* Apply Card */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={5}
                className="h-full"
              >
                <div className="h-full p-8 rounded-[32px] border-2 border-dashed border-white/5 hover:border-purple-500/30 transition-all duration-500 flex flex-col items-center justify-center text-center group">
                  <div className="w-20 h-20 rounded-full bg-purple-500/5 flex items-center justify-center mb-8 border border-white/5 group-hover:bg-purple-500/10 transition-colors">
                    <Rocket className="w-8 h-8 text-purple-500/50 group-hover:text-purple-400 transition-colors animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Your Vision</h3>
                  <p className="text-zinc-500 mb-10 max-w-[200px] font-light">
                    We are accepting 5 new companies for our Fall cohort.
                  </p>
                  <Button variant="link" className="text-purple-400 hover:text-purple-300 font-bold p-0 flex items-center gap-2 text-lg group-hover:translate-x-1 transition-transform">
                    Apply Now <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-40">
          <div className="max-w-5xl mx-auto rounded-[4rem] bg-gradient-to-b from-zinc-900/50 to-black p-12 md:p-32 text-center relative overflow-hidden border border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)]" />
            
            <div className="relative z-10">
              <ScrollFloat className="text-4xl md:text-7xl font-bold text-white mb-10 tracking-tight leading-none">
                Build the future together.
              </ScrollFloat>
              <p className="text-zinc-500 text-lg md:text-xl mb-14 max-w-xl mx-auto font-light leading-relaxed">
                Join a selective group of builders creating the next generation of commerce infrastructure.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link href="/labs/apply">
                  <Button size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-full px-12 h-16 text-lg font-bold transition-all duration-300 hover:scale-105 shadow-2xl">
                    Submit Application
                  </Button>
                </Link>
                <span className="text-zinc-600 text-sm font-medium uppercase tracking-widest">or</span>
                <Link href="/labs/manifesto">
                  <Button variant="link" className="text-white hover:text-purple-400 font-bold text-lg p-0">
                    Read the Studio Manifesto
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
