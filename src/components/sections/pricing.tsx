"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import ScrollFloat from "@/components/ui/scroll-float";
import SpotlightCard from "@/components/ui/spotlight-card";

interface OptionCard {
  title: string;
  label: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  footerText?: string;
  isFeatured?: boolean;
}

const options: OptionCard[] = [
  {
    title: "Starter",
    label: "Run locally and explore the stack.",
    features: ["Next.js merchant dashboard", "Storefront + cart flows", "MCP routes included", "Supabase-backed data model"],
    ctaText: "Get Started",
    ctaHref: "/signup",
    footerText: "Best for evaluation",
  },
  {
    title: "Self-Hosted",
    label: "Deploy your own production commerce stack.",
    features: ["Unlimited products and orders", "AI shopping flows enabled", "Custom domains supported", "Own your infra and secrets"],
    ctaText: "Deploy Your Stack",
    ctaHref: "/signup",
    footerText: "Recommended",
    isFeatured: true,
  },
  {
    title: "Custom",
    label: "Adapt workflows and branding for your team.",
    features: ["Merchant customization", "Extend MCP tooling", "Bring your own payment setup", "Tailor AI instructions and flows"],
    ctaText: "View Docs",
    ctaHref: "/about",
    footerText: "Built for extension",
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-black py-16 sm:py-16 md:py-40">
      <div
        className="absolute left-1/2 top-1/2 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(168, 85, 247, 0.3) 0%, rgba(236, 72, 153, 0.15) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

      <div className="container relative z-10 px-4 sm:px-4">
        <div className="mx-auto mb-10 max-w-4xl text-center sm:mb-12 md:mb-20">
          <ScrollFloat containerClassName="mb-4 text-3xl font-semibold tracking-tight text-white md:mb-6 md:text-[3rem]">
            Self-Hosted Commerce, No SaaS Paywalls
          </ScrollFloat>
          <p className="mx-auto max-w-2xl text-base text-[#737373]">
            Use the open-source stack locally or in production. Core merchant, storefront, checkout, and MCP capabilities ship in the repo.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-5 items-stretch">
          {options.map((option) => (
            <SpotlightCard
              key={option.title}
              className={`relative flex flex-col rounded-[24px] border bg-[#0A0A0A] p-5 transition-all duration-300 hover:border-[#3B3B3B] md:rounded-[32px] md:p-7 ${option.isFeatured ? "border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.1)]" : "border-[#1F1F1F]"}`}
              spotlightColor={option.isFeatured ? "rgba(168, 85, 247, 0.25)" : "rgba(168, 85, 247, 0.12)"}
            >
              {option.isFeatured && (
                <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  Recommended
                </div>
              )}

              <div className="mb-6 flex flex-col">
                <div className="mb-4 w-fit rounded-md border border-purple-500/15 bg-[#171717] px-2 py-1 text-[12px] font-medium text-white">
                  {option.title}
                </div>
                <p className="text-sm font-medium text-[#737373]">{option.label}</p>
              </div>

              <div className="mb-7 flex flex-1 flex-col gap-3">
                {option.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 flex-shrink-0 text-white" />
                    <span className="text-sm text-neutral-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Link
                href={option.ctaHref}
                className="flex h-12 w-full items-center justify-center rounded-full border border-purple-500/20 bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] active:scale-95"
              >
                {option.ctaText}
              </Link>

              {option.footerText && <p className="mt-4 text-center text-[12px] text-[#737373]">{option.footerText}</p>}
            </SpotlightCard>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-[#737373] transition-colors hover:text-white">
            Learn how to deploy and customize
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
