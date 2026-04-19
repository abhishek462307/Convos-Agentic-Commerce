"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-50 border border-zinc-100 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Legal
            </div>
            <h1 className="text-[40px] font-bold tracking-tight">Terms of Service</h1>
            <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Last updated: April 7, 2026</p>
          </div>

          <div className="space-y-12">
            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">1. Acceptance of Terms</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">
                By accessing or using Convos (&quot;Platform&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">2. Description of Software</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">
                Convos is open-source commerce software that you self-host. It includes merchant tooling, storefront routes, checkout, and optional AI-assisted customer interactions.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">3. Account Registration</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">To use certain features of the Platform, you must be at least 18 years old and provide accurate registration information. You are responsible for maintaining the security of your account credentials.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">4. Self-Hosting and Infrastructure</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">You are responsible for your own hosting, infrastructure costs, provider accounts, and operational compliance when deploying this software.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">5. AI Services</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">
                AI responses are generated automatically. AI may produce incorrect information. You are responsible for the customer experience and for reviewing critical AI-generated outputs in your own deployment.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">6. Payment Processing</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">
                Payment processing is configured by each deployment operator (for example Stripe). You are responsible for complying with the terms of the payment providers you enable.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">7. Acceptable Use</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">You agree not to use the platform for any illegal activities, including selling prohibited items, infringing on intellectual property, or transmitting malicious code.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">8. Limitation of Liability</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">
                To the maximum extent permitted by law, Convos shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">9. Governing Law</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of Delaware, United States.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-bold uppercase tracking-wider">10. Contact</h2>
              <p className="text-zinc-600 font-medium leading-relaxed">
                For questions about your deployment, contact your store operator.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-20 border-t border-zinc-100">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300">© 2026 Convos. All rights reserved.</p>
          <div className="flex gap-8 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-black transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
