"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Loader2,
  Play,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import LightRays from "@/components/ui/light-rays";
import GradientText from "@/components/ui/gradient-text";

const rotatingWords = ["sell", "talk", "negotiate", "convert"];

export default function HeroSection() {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const handleViewDemo = () => {
    setLoadingDemo(true);
    const demoUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    window.open(demoUrl, "_blank");
    setTimeout(() => setLoadingDemo(false), 1000);
  };

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 pt-20 pb-4 sm:px-4 sm:pt-20 md:px-8 md:pt-40 md:pb-0 bg-black">
      <div className="absolute inset-0 z-0 bg-black" />

      <LightRays
        raysOrigin="top-center"
        raysColor="#a855f7"
        raysSpeed={1.6}
        lightSpread={1.1}
        rayLength={3}
        followMouse={true}
        mouseInfluence={0.1}
        noiseAmount={0.24}
        distortion={0}
        pulsating={false}
        fadeDistance={1.5}
        saturation={1}
      />

      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] md:w-[900px] h-[300px] sm:h-[400px] md:h-[700px] opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.35) 0%, rgba(236, 72, 153, 0.2) 35%, rgba(192, 38, 211, 0.1) 55%, transparent 75%)",
          filter: "blur(80px)",
        }}
      />

      <div className="bg-grid-pattern absolute inset-0 z-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />

      <div className="relative z-20 flex flex-col items-center text-center">
        <Link
          href="#features"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/[0.08] text-[13px] text-white/80 hover:bg-purple-500/[0.14] hover:border-purple-500/50 transition-all mb-6 md:mb-8 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
        >
          <span className="flex h-5 items-center gap-1 px-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[10px] font-bold text-white tracking-wide uppercase">
            <Sparkles className="h-2.5 w-2.5" />
            New
          </span>
          <span className="font-semibold text-white">Convos 2.0 is live</span>
          <span className="text-white/40">—</span>
          <span className="text-purple-300/80 text-[12px]">See what&apos;s new</span>
          <ChevronRight className="h-3.5 w-3.5 text-purple-400/60" />
        </Link>

        <GradientText
          colors={["#a855f7", "#ec4899", "#f97316", "#ec4899", "#a855f7"]}
          animationSpeed={6}
          className="text-[2rem] sm:text-[2.75rem] md:text-8xl lg:text-[6.5rem] font-bold tracking-tight leading-none mb-2 md:mb-4 pb-2"
        >
          <em>Agentic Commerce</em>
        </GradientText>

        <h1 className="text-balance max-w-4xl text-[1.75rem] sm:text-[2rem] md:text-7xl lg:text-[5rem] font-semibold tracking-tight leading-[1.1]">
          <span className="text-white">AI Agents</span>{" "}
          <span className="inline-block relative h-[1.15em] overflow-hidden align-bottom">
            <AnimatePresence mode="wait">
              <motion.span
                key={rotatingWords[wordIndex]}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent"
              >
                {rotatingWords[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        <p className="relative z-20 mx-auto mt-4 md:mt-6 max-w-xl px-1 text-center text-sm sm:text-sm md:text-lg text-[#737373] font-normal leading-relaxed">
          Convos is a conversational commerce platform where AI agents power your entire storefront. They talk to customers, negotiate deals, and close sales — all without you lifting a finger.
        </p>

        <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/signup"
            className="relative w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2 bg-gradient-purple"
          >
            Get early access
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={handleViewDemo}
            disabled={loadingDemo}
            className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-medium text-white/80 border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2"
          >
            {loadingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Live demo
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 mx-auto mt-6 md:mt-16 w-full max-w-7xl px-0 md:px-4 mb-2 md:mb-8"
      >
        <div
          className="relative p-1.5 md:p-3 rounded-[20px] md:rounded-[40px] backdrop-blur-lg"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            boxShadow: "0 0 80px rgba(255, 255, 255, 0.03), 0 0 160px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="relative rounded-[16px] md:rounded-[32px] overflow-hidden bg-[#0a0a0a] border border-[#1f1f1f] aspect-video">
            <Image
              src="/screenshot-dashboard.webp"
              alt="Convos Dashboard"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none z-30" />
    </section>
  );
}
