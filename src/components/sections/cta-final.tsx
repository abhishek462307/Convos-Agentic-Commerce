"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Play, Loader2, Check } from "lucide-react";
import ScrollFloat from "@/components/ui/scroll-float";

const GridScan = dynamic(
  () => import("@/components/GridScan").then((m) => m.GridScan),
  { ssr: false }
);

export default function CtaFinal() {
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleViewDemo = () => {
    setLoadingDemo(true);
    const demoUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    window.open(demoUrl, "_blank");
    setTimeout(() => setLoadingDemo(false), 1000);
  };

  return (
      <section className="relative w-full bg-black py-16 sm:py-16 md:py-40 overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 z-0">
          <GridScan
            enableWebcam={false}
            linesColor="#6b21a8"
            scanColor="#a855f7"
            scanOpacity={0.4}
            gridScale={0.1}
            lineThickness={1}
            lineStyle="solid"
            scanDirection="pingpong"
            scanDuration={2}
            scanDelay={2}
            scanGlow={0.5}
            scanSoftness={2}
            scanPhaseTaper={0.9}
            noiseIntensity={0.01}
            enablePost={false}
          />
        </div>

      <div className="container relative z-10 flex flex-col items-center text-center">
              <ScrollFloat containerClassName="text-2xl sm:text-3xl md:text-7xl font-semibold tracking-tight leading-[1.1] text-white mb-4 md:mb-6 max-w-4xl px-3 sm:px-4">
                Your store deserves an AI upgrade
              </ScrollFloat>

          <p className="mx-auto mt-3 sm:mt-4 max-w-xl px-3 sm:px-4 text-center text-sm sm:text-base md:text-lg text-[#737373] font-normal leading-relaxed">
            Deploy your single-merchant commerce stack with auth-first setup and full control over your own infrastructure.
          </p>

        <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto sm:max-w-none sm:w-auto px-3 sm:px-0">
          <Link
              href="/signup"
              className="relative w-full sm:w-auto px-8 py-3 rounded-full text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500"
          >
            Start setup
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={handleViewDemo}
            disabled={loadingDemo}
            className="w-full sm:w-auto px-8 py-3 rounded-full text-sm font-medium text-white/80 border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2"
          >
            {loadingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            View demo
          </button>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-5 text-[13px] text-white/30">
          {["Self-hosted deployment", "Bring your own providers", "Single merchant ready"].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-400/60" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
