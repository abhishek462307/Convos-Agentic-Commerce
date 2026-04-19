"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Mail, MapPin, Users, Zap, Heart, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function AboutPage() {
  const team = [
    { name: "Alex Chen", role: "CEO & Co-founder", avatar: "AC" },
    { name: "Sarah Kim", role: "CTO & Co-founder", avatar: "SK" },
    { name: "Mike Johnson", role: "Head of AI", avatar: "MJ" },
    { name: "Emma Davis", role: "Head of Design", avatar: "ED" },
  ];

  const values = [
    { icon: Zap, title: "Innovation First", description: "We push the boundaries of what's possible in conversational commerce." },
    { icon: Users, title: "Customer Obsession", description: "Every feature we build starts with understanding our users' needs." },
    { icon: Heart, title: "Transparency", description: "We believe in honest, open communication with our community." },
    { icon: Target, title: "Excellence", description: "We hold ourselves to the highest standards in everything we do." },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/50 px-4 py-2.5 backdrop-blur-xl">
            <Link href="/">
              <Logo size="sm" />
            </Link>
            <Link href="/" className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">About Convos</h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              We're building the future of e-commerce, where every customer gets a personal shopping assistant.
            </p>
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-6 sm:p-8">
              <p className="text-zinc-300 text-lg leading-relaxed">
                Convos was founded with a simple belief: shopping should be a conversation, not a catalog. We're on a mission to transform e-commerce by making AI-powered conversational shopping accessible to every business, from indie creators to enterprise brands.
              </p>
              <p className="text-zinc-400 mt-4 leading-relaxed">
                Our platform enables merchants to create AI storefronts that understand customer intent, provide personalized recommendations, and close sales through natural conversations—via text or voice.
              </p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold mb-6">Our Values</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {values.map((value, i) => (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-zinc-950 p-5 hover:border-white/[0.15] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                    <value.icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{value.title}</h3>
                  <p className="text-sm text-zinc-400">{value.description}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold mb-6">Leadership Team</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {team.map((member, i) => (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-zinc-950 p-4 text-center hover:border-white/[0.15] transition-colors">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg">
                    {member.avatar}
                  </div>
                  <h3 className="font-semibold text-white text-sm">{member.name}</h3>
                  <p className="text-xs text-zinc-500">{member.role}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold mb-4">Our Story</h2>
            <div className="space-y-4 text-zinc-400">
              <p className="leading-relaxed">
                Convos started in 2024 when our founders noticed a gap in how online stores interact with customers. While chatbots had become common, they were frustrating—scripted, unhelpful, and unable to actually help customers make purchasing decisions.
              </p>
              <p className="leading-relaxed">
                We asked: what if we could combine the latest advances in AI with deep e-commerce integration? What if every store could have a sales assistant that actually understood their products, answered questions intelligently, and guided customers to the perfect purchase?
              </p>
              <p className="leading-relaxed">
                  Today, Convos powers a growing number of stores worldwide, facilitating AI-driven conversations and helping merchants achieve higher conversion rates.
              </p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 p-8 text-center">
              <h2 className="text-2xl font-bold mb-3">Get in Touch</h2>
              <p className="text-zinc-400 mb-6">Have questions? We'd love to hear from you.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Mail className="w-4 h-4 text-violet-400" />
                  hello@convos.com
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <MapPin className="w-4 h-4 text-violet-400" />
                  San Francisco, CA
                </div>
              </div>
              <Button asChild className="bg-white text-black hover:bg-zinc-200">
                <Link href="/signup">
                  Start Building <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.section>
        </div>
      </main>

      <footer className="border-t border-white/5 py-6">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-zinc-600">© 2026 Convos. All rights reserved.</p>
          <div className="flex gap-4 text-[10px] text-zinc-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
