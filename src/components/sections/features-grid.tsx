"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Mic,
  Globe,
  Shield,
  Zap,
  Bot,
  ArrowUpRight,
  Star,
  ShoppingCart,
  Smartphone,
  Lock,
  CreditCard,
  Send,
} from "lucide-react";
import ScrollFloat from "@/components/ui/scroll-float";
import { gsap } from "gsap";

const GLOW_COLOR = "168, 85, 247";
const SPOTLIGHT_RADIUS = 350;
const PARTICLE_COUNT = 10;

 
const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

function createParticleElement(x: number, y: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "bento-particle";
  el.style.cssText = `
    position:absolute;width:4px;height:4px;border-radius:50%;
    background:rgba(${GLOW_COLOR},1);box-shadow:0 0 6px rgba(${GLOW_COLOR},0.6);
    pointer-events:none;z-index:100;left:${x}px;top:${y}px;
  `;
  return el;
}

function ParticleCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<number[]>([]);
  const isHoveredRef = useRef(false);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach((p) => {
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => { p.parentNode?.removeChild(p); },
      });
    });
    particlesRef.current = [];
  }, []);

  const spawnParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const tid = window.setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;
        const p = createParticleElement(
          Math.random() * width,
          Math.random() * height
        );
        cardRef.current.appendChild(p);
        particlesRef.current.push(p);

        gsap.fromTo(
          p,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
        );
        gsap.to(p, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          duration: 2 + Math.random() * 2,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
        gsap.to(p, {
          opacity: 0.3,
          duration: 1.5,
          ease: "power2.inOut",
          repeat: -1,
          yoyo: true,
        });
      }, i * 100);
      timeoutsRef.current.push(tid);
    }
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onEnter = () => {
      isHoveredRef.current = true;
      spawnParticles();
    };
    const onLeave = () => {
      isHoveredRef.current = false;
      clearParticles();
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      isHoveredRef.current = false;
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      clearParticles();
    };
  }, [spawnParticles, clearParticles]);

  return (
    <div
      ref={cardRef}
      className={`${className} relative overflow-hidden`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
    >
      {children}
    </div>
  );
}

function GlobalSpotlight({
  gridRef,
}: {
  gridRef: React.RefObject<HTMLDivElement | null>;
}) {
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    const spotlight = document.createElement("div");
    spotlight.style.cssText = `
      position:fixed;width:800px;height:800px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle,
        rgba(${GLOW_COLOR},0.12) 0%,rgba(${GLOW_COLOR},0.06) 20%,
        rgba(${GLOW_COLOR},0.02) 40%,transparent 70%);
      z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const grid = gridRef.current;
    const proximity = SPOTLIGHT_RADIUS * 0.5;
    const fadeDistance = SPOTLIGHT_RADIUS * 0.75;

    const onMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !grid) return;

      const rect = grid.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      const cards = grid.querySelectorAll<HTMLElement>(".bento-card");

      if (!inside) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3 });
        cards.forEach((c) => c.style.setProperty("--glow-intensity", "0"));
        return;
      }

      let minDist = Infinity;
      cards.forEach((card) => {
        const cr = card.getBoundingClientRect();
        const cx = cr.left + cr.width / 2;
        const cy = cr.top + cr.height / 2;
        const dist =
          Math.hypot(e.clientX - cx, e.clientY - cy) -
          Math.max(cr.width, cr.height) / 2;
        const eDist = Math.max(0, dist);
        minDist = Math.min(minDist, eDist);

        let glow = 0;
        if (eDist <= proximity) glow = 1;
        else if (eDist <= fadeDistance)
          glow = (fadeDistance - eDist) / (fadeDistance - proximity);

        const rx = ((e.clientX - cr.left) / cr.width) * 100;
        const ry = ((e.clientY - cr.top) / cr.height) * 100;
        card.style.setProperty("--glow-x", `${rx}%`);
        card.style.setProperty("--glow-y", `${ry}%`);
        card.style.setProperty("--glow-intensity", glow.toString());
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
      });

      const opacity =
        minDist <= proximity
          ? 0.8
          : minDist <= fadeDistance
            ? ((fadeDistance - minDist) / (fadeDistance - proximity)) * 0.8
            : 0;
      gsap.to(spotlightRef.current, {
        opacity,
        duration: opacity > 0 ? 0.2 : 0.5,
      });
    };

    const onLeave = () => {
      grid.querySelectorAll<HTMLElement>(".bento-card").forEach((c) =>
        c.style.setProperty("--glow-intensity", "0")
      );
      if (spotlightRef.current)
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3 });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [gridRef]);

  return null;
}

const borderGlowStyles = `
  .bento-card {
    --glow-x: 50%;
    --glow-y: 50%;
    --glow-intensity: 0;
  }
  .bento-card::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    background: radial-gradient(
      ${SPOTLIGHT_RADIUS}px circle at var(--glow-x) var(--glow-y),
      rgba(${GLOW_COLOR}, calc(var(--glow-intensity) * 0.8)) 0%,
      rgba(${GLOW_COLOR}, calc(var(--glow-intensity) * 0.4)) 30%,
      transparent 60%
    );
    border-radius: inherit;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
    z-index: 1;
    transition: opacity 0.3s ease;
  }
  .bento-card:hover {
    box-shadow: 0 4px 20px rgba(46,24,78,0.4), 0 0 30px rgba(${GLOW_COLOR},0.15);
  }
`;

export default function FeaturesGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const Card = isMobile
    ? ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
        <div className={className} style={style}>{children}</div>
      )
    : ParticleCard;

  return (
      <section id="features" className="w-full max-w-7xl mx-auto py-16 sm:py-16 md:py-32 px-4 sm:px-4 md:px-8 bg-black">
      <style dangerouslySetInnerHTML={{ __html: borderGlowStyles }} />
      {!isMobile && <GlobalSpotlight gridRef={gridRef} />}

        <div className="text-center mb-8 sm:mb-12 md:mb-20">
            <ScrollFloat
              className="text-balance relative z-20 mx-auto mb-4 max-w-4xl text-2xl sm:text-3xl md:text-6xl font-semibold tracking-tight leading-tight text-white"
          >Everything your store needs, agent-first</ScrollFloat>
        <p className="max-w-lg text-sm md:text-base text-center mx-auto mt-4 text-[#737373]">
          A complete commerce platform where AI agents handle every customer interaction — from browsing to checkout.
        </p>
      </div>

        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-4 auto-rows-auto lg:auto-rows-[28rem]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          custom={0}
          className="lg:col-span-2"
        >
          <Card
              className="bento-card rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden flex flex-col justify-between p-5 sm:p-6 md:p-8 hover:border-[#2a2a2a] transition-colors duration-500 min-h-[18rem] sm:min-h-[22rem] lg:min-h-[28rem] h-full"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <div className="relative w-[180px] sm:w-[280px] h-[180px] sm:h-[280px]">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full border border-white/[0.04] animate-[spin_25s_linear_infinite]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[75%] rounded-full border border-white/[0.06] animate-[spin_18s_linear_infinite_reverse]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full border border-white/[0.03]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500/40 blur-sm" />
                  <div className="absolute top-2 left-1/2 -ml-4 w-8 h-8 sm:w-10 sm:h-10 sm:-ml-5 bg-[#141414] border border-white/[0.08] rounded-xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="text-white/70 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="absolute bottom-6 right-2 sm:bottom-8 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 bg-[#141414] border border-white/[0.08] rounded-xl flex items-center justify-center shadow-lg">
                    <Bot className="text-white/70 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="absolute top-1/2 left-1 sm:left-2 -mt-4 sm:-mt-5 w-7 h-7 sm:w-8 sm:h-8 bg-[#141414] border border-white/[0.08] rounded-lg flex items-center justify-center shadow-lg">
                    <Star className="text-purple-400/70 w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              </div>
            <div className="relative z-10 flex items-start">
              <div className="w-11 h-11 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white/80" />
              </div>
            </div>
            <div className="relative z-10 mt-auto">
              <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                AI-Powered<br />Conversations
              </h3>
              <p className="font-sans max-w-[280px] text-[13px] font-normal leading-relaxed mt-3 text-[#737373]">
                Deploy AI agents that greet customers, answer questions, recommend products, and understand context, preferences, and intent — replacing static product pages.
              </p>
              <button className="mt-5 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[13px] font-medium hover:from-purple-400 hover:to-pink-400 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                Learn More
              </button>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          custom={1}
          className="lg:col-span-3"
        >
          <Card
              className="bento-card rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden flex flex-col p-0 hover:border-[#2a2a2a] transition-colors duration-500 h-full"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -right-20 w-[350px] h-[350px]">
                <svg viewBox="0 0 350 350" fill="none" className="w-full h-full opacity-30">
                  <circle cx="175" cy="175" r="140" stroke="url(#voiceGrad)" strokeWidth="1" />
                  <circle cx="175" cy="175" r="100" stroke="url(#voiceGrad)" strokeWidth="0.5" />
                  <defs>
                    <radialGradient id="voiceGrad" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <div className="flex flex-col h-full relative z-10">
                <div className="p-5 sm:p-6 md:p-8 pb-0">
                <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                  Voice Shopping<br />Experience
                </h3>
                <p className="font-sans max-w-md text-[13px] font-normal leading-relaxed mt-3 text-[#737373]">
                  Let customers shop hands-free with built-in voice AI. They speak naturally to browse, compare, and buy — no typing needed.
                </p>
              </div>
              <div className="mt-auto p-5 sm:p-6 pt-4">
                <div className="relative rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] p-5 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                        <Mic className="h-4 w-4 text-white" />
                      </div>
                      <div className="absolute -inset-1 rounded-full border border-purple-500/20 animate-[pulse_2s_ease-in-out_infinite]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                        <span className="text-[10px] font-semibold text-purple-400/80 uppercase tracking-[0.15em]">Listening</span>
                      </div>
                      <div className="flex gap-[2px] h-5 items-center mt-1">
                        {[6, 14, 10, 18, 5, 16, 12, 20, 8, 15, 18, 6, 15, 10, 17, 13, 20, 8, 12, 18].map((h, i) => (
                          <div
                            key={i}
                            className="w-[2px] rounded-full bg-gradient-to-t from-purple-500/30 to-pink-300/80"
                            style={{
                              height: `${h}px`,
                              animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite alternate`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                        <Mic className="w-2.5 h-2.5 text-white/40" />
                      </div>
                      <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-tl-sm px-3.5 py-2">
                        <p className="text-[12px] text-white/60">&quot;Show me running shoes under $120&quot;</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 justify-end">
                      <div className="bg-gradient-to-br from-purple-500/[0.08] to-pink-600/[0.03] border border-purple-500/[0.08] rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%]">
                        <p className="text-[12px] text-white/60">Found 12 options. The Nike Pegasus 41 is trending — $109 with 4.8 stars. Want me to add it?</p>
                      </div>
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
                        <Bot className="w-2.5 h-2.5 text-purple-400" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                        <Star className="w-2 h-2 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-emerald-400/60">Order confirmed in 12s</span>
                    </div>
                    <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[11px] font-medium shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                      <ShoppingCart className="w-3 h-3" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          custom={2}
          className="lg:col-span-3"
        >
            <Card
              className="bento-card rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden flex flex-col justify-between p-5 sm:p-6 md:p-8 hover:border-[#2a2a2a] transition-colors duration-500 min-h-[18rem] sm:min-h-[22rem] lg:min-h-[28rem] h-full"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                <div>
                  <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                    Intent<br />Analytics
                </h3>
                <p className="font-sans text-[13px] font-normal leading-relaxed mt-3 text-[#737373] max-w-sm">
                  See exactly what customers want in real-time. The platform streams live intent signals so you can optimize products, pricing, and inventory.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/[0.08] border border-emerald-500/15 px-3 py-1.5 rounded-full">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-[13px] font-semibold">+ 14%</span>
              </div>
            </div>
            <div className="mt-auto">
              <div className="h-[140px] flex items-end gap-[6px]">
                {[
                  { h: 25, color: "from-purple-900/60 to-purple-500/40" },
                  { h: 35, color: "from-purple-900/60 to-purple-400/50" },
                  { h: 30, color: "from-purple-800/60 to-purple-400/50" },
                  { h: 45, color: "from-purple-700/60 to-fuchsia-400/50" },
                  { h: 40, color: "from-purple-600/50 to-fuchsia-400/50" },
                  { h: 55, color: "from-purple-600/50 to-pink-400/50" },
                  { h: 50, color: "from-purple-500/50 to-pink-400/50" },
                  { h: 65, color: "from-fuchsia-500/50 to-pink-400/50" },
                  { h: 60, color: "from-fuchsia-500/50 to-pink-400/50" },
                  { h: 75, color: "from-pink-600/50 to-pink-400/50" },
                  { h: 70, color: "from-pink-600/50 to-pink-300/50" },
                  { h: 85, color: "from-pink-500/50 to-pink-300/60" },
                  { h: 80, color: "from-pink-500/50 to-rose-300/60" },
                  { h: 92, color: "from-pink-400/50 to-rose-300/60" },
                ].map((bar, i) => (
                  <div
                    key={i}
                    className={`flex-1 bg-gradient-to-t ${bar.color} rounded-t-[3px] transition-all duration-300 hover:opacity-80`}
                    style={{ height: `${bar.h}%` }}
                  />
                ))}
              </div>
              <button className="mt-5 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[13px] font-medium hover:from-purple-400 hover:to-pink-400 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                View Analytics
              </button>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          custom={3}
          className="lg:col-span-2"
        >
            <Card
              className="bento-card rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden flex flex-col justify-between p-5 sm:p-6 md:p-8 hover:border-[#2a2a2a] transition-colors duration-500 min-h-[18rem] sm:min-h-[22rem] lg:min-h-[28rem] h-full"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <div>
                <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                  Autonomous<br />Pricing
              </h3>
              <p className="font-sans max-w-[260px] text-[13px] font-normal leading-relaxed mt-3 text-[#737373]">
                AI agents negotiate within your margins automatically — maximizing both conversion and profit without human intervention.
              </p>
            </div>
            <div className="mt-auto space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-[#555] uppercase tracking-[0.1em] font-medium">Avg. discount</p>
                  <p className="text-[1.5rem] md:text-[2rem] font-bold text-white leading-none mt-1">8.2%</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#555] uppercase tracking-[0.1em] font-medium">Revenue recovered</p>
                  <p className="text-[1.5rem] md:text-[2rem] font-bold text-white leading-none mt-1">$129k</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-white/[0.05] gap-3">
                <button className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[13px] font-medium hover:from-purple-400 hover:to-pink-400 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                  Manage Pricing
                </button>
                <div className="flex items-center gap-1.5">
                  {["EN.", "LET"].map((lang) => (
                    <span key={lang} className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40 font-medium">
                      {lang}
                    </span>
                  ))}
                  <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40 font-medium">89%</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

        <div className="text-center mt-16 sm:mt-20 md:mt-28 mb-8 sm:mb-12 md:mb-20">
          <ScrollFloat
            className="text-balance relative z-20 mx-auto mb-4 max-w-4xl text-2xl sm:text-3xl md:text-5xl font-semibold tracking-tight leading-tight text-white"
          >Sell where your customers already are</ScrollFloat>
          <p className="max-w-lg text-sm md:text-base text-center mx-auto mt-4 text-[#737373]">
            WhatsApp, web, voice — one AI agent handles every channel. Customers shop without leaving their favorite app.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-4 auto-rows-auto lg:auto-rows-[28rem]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            custom={0}
            className="lg:col-span-3"
          >
            <Card
              className="bento-card rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden flex flex-col p-0 hover:border-[#2a2a2a] transition-colors duration-500 h-full"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
              <div className="flex flex-col h-full relative z-10">
                <div className="p-5 sm:p-6 md:p-8 pb-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                        WhatsApp Commerce
                      </h3>
                    </div>
                  </div>
                  <p className="font-sans max-w-md text-[13px] font-normal leading-relaxed text-[#737373]">
                    Your AI agent lives inside WhatsApp. Customers browse products, add to cart, and pay — all without leaving the chat.
                  </p>
                </div>
                <div className="mt-auto p-5 sm:p-6 pt-4">
                  <div className="relative rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] p-5 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Smartphone className="w-2.5 h-2.5 text-white/40" />
                        </div>
                        <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-tl-sm px-3.5 py-2">
                          <p className="text-[12px] text-white/60">&quot;I want a birthday gift under $50&quot;</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 justify-end">
                        <div className="bg-gradient-to-br from-emerald-500/[0.08] to-emerald-600/[0.03] border border-emerald-500/[0.08] rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%]">
                          <p className="text-[12px] text-white/60">Here are 3 perfect picks! The Scented Candle Set is our bestseller at $34.</p>
                        </div>
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <Bot className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 justify-end">
                        <div className="flex gap-2">
                          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">Add to Cart</span>
                          <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/50 font-medium">Tell me more</span>
                          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">Buy Now</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Smartphone className="w-2.5 h-2.5 text-white/40" />
                        </div>
                        <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-tl-sm px-3.5 py-2">
                          <p className="text-[12px] text-white/60">taps <span className="text-emerald-400">Buy Now</span></p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 justify-end">
                        <div className="bg-gradient-to-br from-emerald-500/[0.08] to-emerald-600/[0.03] border border-emerald-500/[0.08] rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%]">
                          <p className="text-[12px] text-white/60">Here&apos;s your secure payment link. Tap to complete checkout:</p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <CreditCard className="w-3 h-3 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400 underline underline-offset-2">pay.your-domain.com/checkout/a8f3...</span>
                          </div>
                        </div>
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <Bot className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                          <Star className="w-2 h-2 text-emerald-400" />
                        </div>
                        <span className="text-[10px] text-emerald-400/60">Full checkout in WhatsApp</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            custom={1}
            className="lg:col-span-2"
          >
            <Card
              className="bento-card rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] overflow-hidden flex flex-col justify-between p-5 sm:p-6 md:p-8 hover:border-[#2a2a2a] transition-colors duration-500 min-h-[18rem] sm:min-h-[22rem] lg:min-h-[28rem] h-full"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center mb-5">
                  <Lock className="w-5 h-5 text-white/80" />
                </div>
                <h3 className="text-xl md:text-[2.25rem] font-medium leading-[1.15] tracking-tight text-white">
                  OTP<br />Authentication
                </h3>
                <p className="font-sans max-w-[280px] text-[13px] font-normal leading-relaxed mt-3 text-[#737373]">
                  Customers verify identity via email OTP — sent through your own SMTP. No passwords, no friction, just a code to their inbox.
                </p>
              </div>
              <div className="relative z-10 mt-auto space-y-3">
                <div className="rounded-xl bg-[#0f0f0f] border border-[#1a1a1a] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[11px] text-white/50 font-medium">OTP sent to j***n@email.com</span>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {["4", "8", "2", "9", "1", "7"].map((d, i) => (
                      <div key={i} className="w-9 h-11 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                        <span className="text-lg font-mono font-semibold text-white/80">{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] text-emerald-400/70">Verified via your SMTP</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-4 mt-4 sm:mt-4">
          {[
            {
              icon: Globe,
              title: "50+ Languages",
              desc: "Your store speaks every language. AI agents respond in any customer's native tongue, globally.",
              tags: ["EN", "ES", "FR", "DE", "CE", "JP", "AR"],
            },
            {
                icon: Shield,
                title: "Built with Security in Mind",
                desc: "Designed with privacy and data protection principles. Payments handled securely through Stripe.",
                tags: ["Privacy", "Stripe", "Encrypted"],
            },
            {
              icon: Zap,
              title: "Launch in Minutes",
              desc: "Migrate from Shopify, WooCommerce, or import a CSV. Your agentic store goes live instantly.",
              tags: ["Shopify", "WooCommerce", "CSV"],
            },
            {
              icon: Bot,
              title: "ChatGPT MCP Support",
              desc: "Connect your store directly to ChatGPT. Manage inventory, orders, and stats through natural language.",
              tags: ["Model Context Protocol", "ChatGPT", "Secure Auth"],
            },
          ].map((card, i) => (
          <motion.div
            key={card.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            custom={i}
          >
              <Card
                className="bento-card rounded-[20px] sm:rounded-[24px] bg-[#0A0A0A] border border-[#1F1F1F] p-5 sm:p-7 hover:border-[#2a2a2a] transition-colors duration-500 h-full"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="w-10 h-10 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center mb-5">
                <card.icon className="w-5 h-5 text-[#666]" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1.5">{card.title}</h3>
              <p className="text-[13px] text-[#737373] leading-relaxed mb-5">{card.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {card.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
