"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Rocket, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import GradientText from "@/components/ui/gradient-text";
import { toast } from "sonner";
import SpotlightCard from "@/components/ui/spotlight-card";

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

export default function LabsApplyPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success("Application submitted successfully!");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black text-white antialiased flex flex-col">
        <Navigation />
        <main className="flex-grow flex items-center justify-center px-6 py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center relative z-10"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-8 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4 tracking-tight">Application Received</h1>
            <p className="text-zinc-400 mb-8 leading-relaxed font-light">
              Thanks for applying to Convos Labs. Our team will review your vision for agentic commerce and get back to you within 72 hours.
            </p>
            <Link href="/labs">
              <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full px-10 h-12 text-base font-bold backdrop-blur-md transition-all duration-300">
                Return to Labs
              </Button>
            </Link>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white antialiased overflow-x-hidden">
      <Navigation />
      
      <main className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[320px] sm:w-[500px] md:w-[900px] h-[300px] sm:h-[400px] md:h-[700px] opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.35) 0%, rgba(236, 72, 153, 0.2) 35%, rgba(192, 38, 211, 0.1) 55%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        <div className="relative z-10 pt-40 pb-32 px-6 max-w-4xl mx-auto">
          <Link href="/labs" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 group text-sm font-medium">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Labs
          </Link>

          <div className="mb-16 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/[0.08] text-[13px] text-white/90 hover:bg-purple-500/[0.14] transition-all mb-8 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
              <span className="flex h-5 items-center gap-1 px-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[10px] font-bold text-white tracking-wide uppercase">
                <Rocket className="h-2.5 w-2.5" />
                Intake
              </span>
              <span className="font-semibold">Cohort Fall &apos;26</span>
            </motion.div>
            
            <GradientText
              colors={["#a855f7", "#ec4899", "#f97316", "#ec4899", "#a855f7"]}
              animationSpeed={8}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-none"
            >
              Apply to <em>Convos Labs</em>
            </GradientText>
            
            <motion.p 
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-zinc-400 font-light leading-relaxed max-w-2xl mx-auto"
            >
              We're looking for founders building the next generation of autonomous commerce. Tell us about your vision.
            </motion.p>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
          >
            <SpotlightCard className="p-8 md:p-12 rounded-[32px] bg-[#0A0A0A] border border-[#1F1F1F] shadow-2xl" spotlightColor="rgba(168, 85, 247, 0.15)">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium text-zinc-400 ml-1">Full Name</Label>
                    <Input id="name" required placeholder="Satya Nadella" className="bg-white/5 border-white/10 rounded-2xl h-14 text-base focus:border-purple-500/50 transition-all focus:ring-0 px-5 text-white placeholder:text-zinc-600" />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium text-zinc-400 ml-1">Email Address</Label>
                    <Input id="email" type="email" required placeholder="satya@microsoft.com" className="bg-white/5 border-white/10 rounded-2xl h-14 text-base focus:border-purple-500/50 transition-all focus:ring-0 px-5 text-white placeholder:text-zinc-600" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="startup" className="text-sm font-medium text-zinc-400 ml-1">Startup Name</Label>
                  <Input id="startup" required placeholder="Vesper AI" className="bg-white/5 border-white/10 rounded-2xl h-14 text-base focus:border-purple-500/50 transition-all focus:ring-0 px-5 text-white placeholder:text-zinc-600" />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="vision" className="text-sm font-medium text-zinc-400 ml-1">The Vision</Label>
                  <Textarea 
                    id="vision" 
                    required 
                    placeholder="What are you building? How does it redefine commerce through agentic intelligence?" 
                    className="bg-white/5 border-white/10 rounded-2xl min-h-[160px] text-base focus:border-purple-500/50 transition-all focus:ring-0 resize-none p-5 text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="stack" className="text-sm font-medium text-zinc-400 ml-1">Why the Convos Stack?</Label>
                  <Textarea 
                    id="stack" 
                    required 
                    placeholder="Which parts of our infrastructure (Intent Stream, Consumer Matrix, etc.) will you build upon?" 
                    className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] text-base focus:border-purple-500/50 transition-all focus:ring-0 resize-none p-5 text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="pt-6">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-white text-black hover:bg-zinc-200 rounded-full h-16 text-lg font-bold transition-all duration-300 flex items-center justify-center gap-3 group shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-[1.02]"
                  >
                    {isSubmitting ? "Submitting Application..." : (
                      <>
                        Submit Application
                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </SpotlightCard>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
