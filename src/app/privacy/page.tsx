"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-zinc-500 text-sm mb-8">Last updated: January 17, 2026</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
              <p className="text-zinc-400 leading-relaxed">
                Convos ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our conversational commerce platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
              <p className="text-zinc-400 leading-relaxed mb-3">We collect information you provide directly to us, including:</p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2">
                <li>Account information (name, email, password)</li>
                <li>Business information (store name, business details)</li>
                <li>Payment information (processed securely via Stripe)</li>
                <li>Communication data (chat logs, voice interactions)</li>
                <li>Usage data (how you interact with our platform)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
              <p className="text-zinc-400 leading-relaxed mb-3">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Train and improve our AI models (anonymized data only)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing</h2>
              <p className="text-zinc-400 leading-relaxed">
                We do not sell your personal information. We may share your information with third-party service providers who perform services on our behalf, such as payment processing (Stripe), hosting (Vercel, Supabase), and AI services (OpenAI). These providers are bound by contractual obligations to keep personal information confidential.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Security</h2>
              <p className="text-zinc-400 leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption in transit (TLS) and at rest, secure authentication, and regular security audits. However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
              <p className="text-zinc-400 leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to data processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Cookies</h2>
              <p className="text-zinc-400 leading-relaxed">
                We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Children's Privacy</h2>
              <p className="text-zinc-400 leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. International Transfers</h2>
              <p className="text-zinc-400 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in compliance with applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
              <p className="text-zinc-400 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
              <p className="text-zinc-400 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at privacy@convos.com.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-6">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-zinc-600">© 2026 Convos. All rights reserved.</p>
          <div className="flex gap-4 text-[10px] text-zinc-500">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
