"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/aceternity";

export default function PitchRootPage() {
  return (
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
}
