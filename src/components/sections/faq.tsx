"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import ScrollFloat from "@/components/ui/scroll-float";

const faqData = [
  {
    question: "How is Convos different from Shopify?",
    answer: "Shopify gives you a static storefront. Convos gives you an agentic one — AI agents actively engage customers, negotiate prices, recommend products, and close sales. It's not a plugin; it's a full commerce platform built for the AI era.",
  },
  {
    question: "Can I migrate my existing Shopify or WooCommerce store?",
    answer: "Yes. Import your product catalog from Shopify, WooCommerce, or via CSV in minutes. Your AI agents will index everything and be ready to sell immediately.",
  },
  {
    question: "How do the AI agents handle pricing and discounts?",
    answer: "You set pricing rules, minimum margins, and negotiation limits. AI agents work within your boundaries to autonomously negotiate with customers, maximizing both conversion and profit.",
  },
  {
    question: "How does voice shopping work?",
    answer: "Customers can speak naturally to browse products, ask questions, and make purchases. Our real-time voice AI processes speech instantly and responds conversationally — no typing needed.",
  },
  {
    question: "Is there a free plan available?",
    answer: "Yes! Our Starter plan is free forever with up to 100 AI conversations per month and one storefront agent. Upgrade to Pro when you need more agents and advanced features like autonomous pricing.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative w-full py-16 md:py-40 bg-black overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.4) 0%, rgba(236, 72, 153, 0.2) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div className="container relative z-10 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center">
        <div className="text-center mb-10 md:mb-20">
              <ScrollFloat containerClassName="text-3xl md:text-6xl mb-4 md:mb-6 font-semibold tracking-tight text-white">
                Frequently Asked Questions
              </ScrollFloat>
          <p className="max-w-2xl mx-auto text-[#737373] text-sm md:text-lg">
              Everything you need to know about Convos — the agentic commerce platform.
          </p>
        </div>

        <div className="w-full max-w-3xl mx-auto">
            {faqData.map((item, index) => (
              <div key={index} className="border-b border-purple-500/10 last:border-0">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between py-5 md:py-6 text-left group"
              >
                <span className="text-sm md:text-xl font-medium text-white group-hover:text-neutral-300 transition-colors pr-4">
                  {item.question}
                </span>
                <ChevronDown
                    className={`w-5 h-5 text-purple-400/60 transition-transform duration-300 shrink-0 ${openIndex === index ? "rotate-180" : ""}`}
                />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? "max-h-52 pb-6" : "max-h-0"}`}>
                <div className="text-neutral-500 text-sm md:text-base leading-relaxed pr-4 md:pr-8">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
