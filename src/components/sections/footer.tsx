import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const Twitter = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
  </svg>
);

const Linkedin = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

const Github = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
    <path d="M9 18c-4.51 2-5-2-7-2"></path>
  </svg>
);
const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Feedback Hub", href: "/feedback" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: "#" },
  { icon: Linkedin, href: "#" },
  { icon: Github, href: "#" },
];

export default function Footer() {
  return (
        <footer className="w-full bg-black py-12 sm:py-12 md:py-16 px-4 sm:px-4 md:px-12">
      <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent mb-10 md:mb-16 max-w-7xl mx-auto" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8 sm:gap-12">
        <div className="flex flex-col gap-6 w-full md:w-auto">
          <Link href="/">
            <Logo size="sm" />
          </Link>
            <p className="text-[13px] text-white/30 max-w-[280px] leading-relaxed">
              Agentic commerce. AI agents run your store.
            </p>
          <div className="flex gap-3">
            {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-900 border border-purple-500/10 text-neutral-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all duration-200"
              >
                <social.icon size={14} />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 md:gap-x-12 gap-y-8 md:gap-y-10 w-full md:w-auto lg:gap-x-20">
            {footerLinks.map((category) => (
              <div key={category.title} className="flex flex-col gap-4">
                <h4 className="text-white text-sm font-semibold tracking-wide">{category.title}</h4>
                <ul className="flex flex-col gap-3">
                    {category.links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="text-neutral-500 hover:text-white text-sm transition-colors duration-200">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
      </div>

            <div className="w-full mt-12 md:mt-20">
              <p className="text-[11px] text-neutral-700 tracking-widest uppercase text-center">
                &copy; 2026 Convos. All rights reserved.
              </p>
            </div>
    </footer>
  );
}
