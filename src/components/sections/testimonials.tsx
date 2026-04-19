"use client";

import React from "react";
import { Star } from "lucide-react";
import ScrollFloat from "@/components/ui/scroll-float";

const testimonials = [
  {
    name: "Early Adopter",
    role: "DTC Brand Founder",
    content: "Switching to conversational commerce completely changed how our customers shop. The AI agents handle product questions and recommendations around the clock.",
    initials: "EA",
  },
  {
    name: "Beta Merchant",
    role: "Online Store Owner",
    content: "Voice shopping feels like the future. Customers can just talk to the store instead of scrolling through pages — it's a much more natural experience.",
    initials: "BM",
  },
  {
    name: "Launch Partner",
    role: "E-commerce Operator",
    content: "Having AI handle the first line of customer conversations frees us up to focus on product and growth. The support load dropped significantly.",
    initials: "LP",
  },
  {
    name: "Preview User",
    role: "Brand Manager",
    content: "The real-time intent stream gives us insight into what customers are actually looking for. That kind of visibility is hard to get anywhere else.",
    initials: "PU",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="relative w-full bg-black py-16 sm:py-16 md:py-40 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.4) 0%, rgba(236, 72, 153, 0.2) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div className="container relative z-10 px-4 sm:px-4 md:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 sm:gap-8 lg:gap-16 lg:items-start">
        <div className="lg:sticky lg:top-40 lg:w-1/3 space-y-3 md:space-y-4 text-center lg:text-left">
            <ScrollFloat
              className="text-3xl md:text-6xl font-semibold tracking-tight leading-[1.1] text-white"
            >What they say about us</ScrollFloat>
            <p className="max-w-md mx-auto lg:mx-0 text-sm md:text-base text-[#737373] leading-relaxed">
              Early feedback from merchants exploring agentic commerce with Convos.
            </p>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4 md:gap-6">
          <div className="flex flex-col gap-4 sm:gap-4 md:gap-6">
            {[testimonials[0], testimonials[2]].map((t, i) => (
              <div key={i} className="p-4 sm:p-6 bg-[#0a0a0a] rounded-2xl border border-white/10 flex flex-col gap-3 sm:gap-4 group hover:border-white/20 transition-colors">
                <div className="flex gap-0.5 mb-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
                  ))}
                </div>
                <p className="text-[#737373] text-[13px] sm:text-sm leading-relaxed">&quot;{t.content}&quot;</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/15 flex items-center justify-center text-[11px] font-bold text-white/60">
                    {t.initials}
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">{t.name}</h3>
                    <p className="text-[#737373] text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4 sm:gap-4 md:gap-6 sm:translate-y-0 lg:translate-y-12">
            {[testimonials[1], testimonials[3]].map((t, i) => (
              <div key={i} className="p-4 sm:p-6 bg-[#0a0a0a] rounded-2xl border border-white/10 flex flex-col gap-3 sm:gap-4 group hover:border-white/20 transition-colors">
                <div className="flex gap-0.5 mb-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
                  ))}
                </div>
                <p className="text-[#737373] text-[13px] sm:text-sm leading-relaxed">&quot;{t.content}&quot;</p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/15 flex items-center justify-center text-[11px] font-bold text-white/60">
                    {t.initials}
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">{t.name}</h3>
                    <p className="text-[#737373] text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
