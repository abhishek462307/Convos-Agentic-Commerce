"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { Mail, MapPin, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

export type FooterLink = {
  title: string
  href: string
  icon?: ReactNode
}

export type FooterSection = {
  label: string
  links: FooterLink[]
}

export type FooterProps = {
  brandName?: string
  brandDescription?: string
  brandMark?: ReactNode
  brandDetails?: ReactNode
  sections?: FooterSection[]
  note?: string
  copyrightName?: string
  className?: string
}

const defaultSections: FooterSection[] = [
  {
    label: "Product",
    links: [
      { title: "Features", href: "#" },
      { title: "Pricing", href: "#" },
      { title: "Testimonials", href: "#" },
      { title: "Integration", href: "#" },
    ],
  },
  {
    label: "Company",
    links: [
      { title: "FAQs", href: "#" },
      { title: "About Us", href: "#" },
      { title: "Privacy Policy", href: "#" },
      { title: "T&S", href: "#" },
    ],
  },
  {
    label: "Resources",
    links: [
      { title: "Blog", href: "#" },
      { title: "Changelog", href: "#" },
      { title: "Brand", href: "#" },
      { title: "Help", href: "#" },
    ],
  },
  {
    label: "Social Links",
    links: [
      { title: "Facebook", href: "#", icon: <span className="text-[11px] font-semibold uppercase tracking-wide">FB</span> },
      { title: "Instagram", href: "#", icon: <span className="text-[11px] font-semibold uppercase tracking-wide">IG</span> },
      { title: "Youtube", href: "#", icon: <span className="text-[11px] font-semibold uppercase tracking-wide">YT</span> },
      { title: "LinkedIn", href: "#", icon: <span className="text-[11px] font-semibold uppercase tracking-wide">IN</span> },
    ],
  },
]

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: {
  delay?: number
  className?: string
  children: ReactNode
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      className={className}
      initial={{ filter: "blur(4px)", y: -8, opacity: 0 }}
      transition={{ delay, duration: 0.8 }}
      viewport={{ once: true }}
      whileInView={{ filter: "blur(0px)", y: 0, opacity: 1 }}
    >
      {children}
    </motion.div>
  )
}

function renderFooterHref(href: string, children: ReactNode, className?: string) {
  const isExternal = /^https?:\/\//i.test(href)
  const isMailOrPhone = href.startsWith("mailto:") || href.startsWith("tel:")
  const isAnchor = href.startsWith("#")

  if (isExternal || isMailOrPhone || isAnchor) {
    return (
      <a
        className={className}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
      >
        {children}
      </a>
    )
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  )
}

export function Footer({
  brandName = "efferd",
  brandDescription = "Beautify your app with efferd.",
  brandMark,
  brandDetails,
  sections = defaultSections,
  note,
  copyrightName = "efferd",
  className,
}: FooterProps) {
  return (
    <footer
      className={cn(
        "relative flex w-full max-w-none flex-col items-center justify-center rounded-t-4xl border-t px-6 md:rounded-t-6xl md:px-8",
        "dark:bg-[radial-gradient(35%_128px_at_50%_0%,--theme(--color-foreground/.1),transparent)]",
        className
      )}
    >
      <div className="absolute left-1/2 top-0 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20 blur" />

      <div className="w-full max-w-7xl">
        <div className="grid w-full gap-8 py-6 md:py-8 lg:grid-cols-3 lg:gap-8">
          <AnimatedContainer className="space-y-4">
            {brandMark ?? <p className="text-lg font-semibold tracking-tight">{brandName}</p>}
            <p className="mt-8 text-sm text-muted-foreground md:mt-0">{brandDescription}</p>
            {brandDetails ? <div className="flex flex-col gap-2 text-sm text-muted-foreground">{brandDetails}</div> : null}
          </AnimatedContainer>

          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 lg:col-span-2 lg:mt-0">
            {sections.map((section, index) => (
              <AnimatedContainer delay={0.1 + index * 0.1} key={section.label}>
                <div className="mb-10 md:mb-0">
                  <h3 className="text-xs">{section.label}</h3>
                  <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                    {section.links.map((link) => (
                      <li key={`${section.label}-${link.title}`}>
                        {renderFooterHref(
                          link.href,
                          <span className="inline-flex items-center gap-1.5 duration-250 hover:text-foreground">
                            {link.icon}
                            {link.title}
                          </span>,
                          "inline-flex items-center duration-250 hover:text-foreground"
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-linear-to-r via-border" />

      <div className="flex w-full items-center justify-center py-4">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {copyrightName}, All rights reserved
          {note ? ` · ${note}` : ""}
        </p>
      </div>
    </footer>
  )
}
