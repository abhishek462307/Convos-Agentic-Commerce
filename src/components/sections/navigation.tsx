"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className="w-full fixed top-4 inset-x-0 z-50 px-4">
        <div className="hidden lg:flex flex-row items-center justify-between py-2 mx-auto px-6 rounded-full relative z-[60] backdrop-saturate-[1.8] backdrop-blur-lg bg-black/60 border border-white/10 max-w-5xl">
          <Link href="/" className="flex items-center gap-2 shrink-0 relative z-20">
            <Logo size="sm" />
          </Link>

          <div className="flex flex-row flex-1 items-center justify-center space-x-6 text-sm">
          {[
            { label: "Features", href: "#features" },
            { label: "How it Works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-white/70 relative px-3 py-1.5 transition-colors hover:text-white text-sm"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-bold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 flex items-center justify-center rounded-full text-white bg-gradient-purple"
          >
            Get Started
          </Link>
        </div>
      </div>

      <div className="flex relative flex-col lg:hidden w-full max-w-[95%] mx-auto z-50 backdrop-blur-lg backdrop-saturate-[1.8] border border-white/10 bg-black/40 rounded-2xl px-4 py-2">
        <div className="flex flex-row justify-between items-center w-full">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Logo size="sm" />
          </Link>
          <button className="p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="flex flex-col py-4 gap-2">
            {[
              { label: "Features", href: "#features" },
              { label: "How it Works", href: "#how-it-works" },
              { label: "Pricing", href: "#pricing" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-white/70 px-3 py-2 text-sm hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-3 border-t border-white/10">
              <Link href="/login" className="flex-1 text-center py-2.5 text-sm text-white/60 border border-white/10 rounded-full" onClick={() => setMobileOpen(false)}>
                Log in
              </Link>
              <Link href="/signup" className="flex-1 text-center py-2.5 text-sm font-bold text-white bg-gradient-purple rounded-full" onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}