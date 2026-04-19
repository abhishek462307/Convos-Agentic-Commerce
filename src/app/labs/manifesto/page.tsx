"use client";

import React from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import { ArrowLeft, BookOpen, Quote, Shield, Zap, Sparkles, Globe, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GradientText from "@/components/ui/gradient-text";
import SpotlightCard from "@/components/ui/spotlight-card";

const manifestoPoints = [
  {
    title: "Agentic First",
    description: "Commerce shouldn't be a series of buttons; it should be a conversation. We believe every brand needs a persistent, autonomous entity that understands customer intent and handles negotiation natively.",
    icon: <Sparkles className="w-6 h-6 text-purple-400" />,
    color: "rgba(168, 85, 247, 0.15)"
  },
  {
    title: "The Death of Search",
    description: "Browsing and keyword searching are relics of the past. In the agentic era, discovery is driven by proactive intelligence that anticipates needs through the Convos Intent Stream.",
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    color: "rgba(234, 179, 8, 0.15)"
  },
  {
    title: "Sovereign Identity",
    description: "Customers should own their commerce history. The Consumer Matrix provides a cross-platform trust layer that ensures privacy while enabling hyper-personalization without surveillance.",
    icon: <Shield className="w-6 h-6 text-blue-400" />,
    color: "rgba(59, 130, 246, 0.15)"
  },
  {
    title: "Unified Settlement",
    description: "Agent-to-agent transactions require a new financial rail. We are building the protocols for autonomous shopping missions to execute secure, real-time payments across borders.",
    icon: <Globe className="w-6 h-6 text-green-400" />,
    color: "rgba(34, 197, 94, 0.15)"
  }
];

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

export default function LabsManifestoPage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased overflow-x-hidden">
      <Navigation />
      
      <main className="relative">
        {/* Hero Section */}
        <section className="relative flex min-h-[70dvh] flex-col items-center justify-center overflow-hidden px-6 pt-40 pb-20">
          <div className="absolute inset-0 z-0 bg-black" />

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] md:w-[900px] h-[300px] sm:h-[400px] md:h-[700px] opacity-30 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.35) 0%, rgba(236, 72, 153, 0.2) 35%, rgba(192, 38, 211, 0.1) 55%, transparent 75%)",
              filter: "blur(100px)",
            }}
          />

          <div className="relative z-20 flex flex-col items-center text-center max-w-5xl mx-auto">
            <Link href="/labs" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 group text-sm font-medium">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Labs
            </Link>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/[0.08] text-[13px] text-white/90 hover:bg-purple-500/[0.14] transition-all mb-8 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
              <span className="flex h-5 items-center gap-1 px-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[10px] font-bold text-white tracking-wide uppercase">
                <BookOpen className="h-2.5 w-2.5" />
                Thesis
              </span>
              <span className="font-semibold">Convos Labs Manifesto</span>
            </motion.div>
            
            <GradientText
              colors={["#a855f7", "#ec4899", "#f97316", "#ec4899", "#a855f7"]}
              animationSpeed={8}
              className="text-5xl md:text-8xl lg:text-[7rem] font-bold tracking-tight leading-none mb-8"
            >
              The <em>Autonomous</em> <br /> Retail Thesis
            </GradientText>
            
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed font-light italic border-l-2 border-purple-500/30 pl-6 text-left"
            >
              "The next trillion-dollar commerce giant won't be a store; it will be an infrastructure layer for billions of agents."
            </motion.p>
          </div>
        </section>

        {/* Tenets Section */}
        <section className="px-6 py-20 relative bg-black">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {manifestoPoints.map((point, i) => (
                <motion.div
                  key={point.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                  className="h-full"
                >
                  <SpotlightCard 
                    className="h-full p-8 rounded-[32px] bg-[#0A0A0A] border border-[#1F1F1F] hover:border-[#2a2a2a] transition-all duration-500 group flex flex-col"
                    spotlightColor={point.color}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/[0.08] group-hover:scale-110 transition-transform duration-500 shadow-xl mb-8">
                      {point.icon}
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight group-hover:text-purple-300 transition-colors duration-300">
                      {point.title}
                    </h3>
                    <p className="text-zinc-400 text-base leading-relaxed font-light">
                      {point.description}
                    </p>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-32">
          <div className="max-w-5xl mx-auto rounded-[4rem] bg-gradient-to-b from-zinc-900/50 to-black p-12 md:p-32 text-center relative overflow-hidden border border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)]" />
            
            <div className="relative z-10">
              <Quote className="w-12 h-12 text-purple-500/30 mx-auto mb-8" />
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight leading-none">
                Build the future together.
              </h2>
              <p className="text-zinc-500 text-lg md:text-xl mb-12 max-w-xl mx-auto font-light leading-relaxed">
                Join a selective group of builders creating the next generation of commerce infrastructure.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link href="/labs/apply">
                  <Button size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-full px-12 h-16 text-lg font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                    Apply for Cohort &apos;26
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
