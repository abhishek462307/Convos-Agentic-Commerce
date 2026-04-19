"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LampContainer } from "@/components/ui/lamp";

export default function NotFound() {
  return (
    <LampContainer>
      <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeInOut" }}
          className="text-center"
        >
          <span className="text-[7rem] sm:text-[9rem] font-bold leading-none tracking-tighter bg-gradient-to-b from-white/25 to-white/[0.02] bg-clip-text text-transparent select-none">
            404
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="-mt-2 bg-gradient-to-br from-slate-200 to-slate-400 bg-clip-text text-center text-3xl sm:text-4xl font-semibold tracking-tight text-transparent"
        >
          Page not found
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-3 text-slate-400 text-sm sm:text-base text-center max-w-sm mx-auto"
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 transition-all"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to home
          </Link>
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-white/70 font-medium text-sm hover:text-white hover:border-white/20 transition-all"
          >
            View demo
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-12 flex items-center justify-center gap-1.5 text-xs text-white/20"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
          your store domain
        </motion.div>
    </LampContainer>
  );
}
