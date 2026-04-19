"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bot,
  CreditCard,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  MessageSquare,
  MessageSquarePlus,
  Moon,
  Package,
  Rocket,
  Search,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Target,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react"

import { Logo } from "@/components/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import type { Merchant } from "@/types"

type MerchantSidebarMode = "main" | "settings"

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  match?: (pathname: string) => boolean
}

const mainGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard, match: (pathname) => pathname === "/dashboard" },
      { label: "Conversations", href: "/conversations", icon: MessageSquare, match: (pathname) => pathname.startsWith("/conversations") },
      { label: "AI Authority", href: "/ai-authority", icon: Shield, match: (pathname) => pathname.startsWith("/ai-authority") },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingBag, match: (pathname) => pathname.startsWith("/orders") },
      {
        label: "Catalog",
        href: "/products",
        icon: Package,
        match: (pathname) =>
          pathname.startsWith("/products") || pathname.startsWith("/categories") || pathname.startsWith("/collections"),
      },
      { label: "Customers", href: "/customers", icon: Users, match: (pathname) => pathname.startsWith("/customers") },
      { label: "Shipments", href: "/shipments", icon: Truck, match: (pathname) => pathname.startsWith("/shipments") },
      { label: "Store Design", href: "/store-design", icon: LayoutTemplate, match: (pathname) => pathname.startsWith("/store-design") },
      { label: "Reviews", href: "/reviews", icon: Star, match: (pathname) => pathname.startsWith("/reviews") },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Campaigns", href: "/marketing/campaigns", icon: Rocket, match: (pathname) => pathname.startsWith("/marketing/campaigns") },
      { label: "Segments", href: "/marketing/segments", icon: Target, match: (pathname) => pathname.startsWith("/marketing/segments") },
      { label: "Email", href: "/marketing/email", icon: Mail, match: (pathname) => pathname.startsWith("/marketing/email") },
      { label: "WhatsApp", href: "/marketing/whatsapp", icon: MessageSquare, match: (pathname) => pathname.startsWith("/marketing/whatsapp") },
      { label: "Discounts", href: "/discounts", icon: ShoppingCart, match: (pathname) => pathname.startsWith("/discounts") },
      { label: "Analytics", href: "/analytics", icon: TrendingUp, match: (pathname) => pathname.startsWith("/analytics") },
      { label: "Reports", href: "/reports", icon: BarChart3, match: (pathname) => pathname.startsWith("/reports") },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "WA Commerce", href: "/whatsapp-commerce", icon: ShoppingCart, match: (pathname) => pathname.startsWith("/whatsapp-commerce") },
      { label: "MCP", href: "/mcp", icon: Bot, match: (pathname) => pathname.startsWith("/mcp") },
    ],
  },
]

const settingsGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Storefront",
    items: [
      { label: "Store & Region", href: "/settings", icon: LayoutDashboard, match: (pathname) => pathname === "/settings" },
      { label: "Custom Domain", href: "/settings/domain", icon: Search, match: (pathname) => pathname.startsWith("/settings/domain") },
      { label: "SEO & Discovery", href: "/settings/seo", icon: Search, match: (pathname) => pathname.startsWith("/settings/seo") },
      { label: "Customer Login", href: "/settings/login", icon: CreditCard, match: (pathname) => pathname.startsWith("/settings/login") },
    ],
  },
  {
    label: "AI Intelligence",
    items: [
      { label: "AI Intelligence", href: "/settings/ai", icon: Bot, match: (pathname) => pathname.startsWith("/settings/ai") },
      { label: "AI API Keys (BYOK)", href: "/settings/ai-keys", icon: Shield, match: (pathname) => pathname.startsWith("/settings/ai-keys") },
      { label: "WhatsApp Commerce", href: "/whatsapp-commerce", icon: MessageSquare, match: (pathname) => pathname.startsWith("/whatsapp-commerce") },
      { label: "ChatGPT MCP", href: "/settings/mcp", icon: MessageSquarePlus, match: (pathname) => pathname.startsWith("/settings/mcp") },
      { label: "Automation", href: "/settings/automation", icon: Sparkles, match: (pathname) => pathname.startsWith("/settings/automation") },
    ],
  },
  {
    label: "Sales & Logistics",
    items: [
      { label: "Payment Methods", href: "/settings/payments", icon: CreditCard, match: (pathname) => pathname.startsWith("/settings/payments") },
      { label: "Shipping & Taxes", href: "/settings/shipping", icon: Truck, match: (pathname) => pathname.startsWith("/settings/shipping") },
      { label: "Product Import", href: "/settings/import", icon: Package, match: (pathname) => pathname.startsWith("/settings/import") },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Email Settings (SMTP)", href: "/settings/email", icon: Mail, match: (pathname) => pathname.startsWith("/settings/email") },
      { label: "Notifications", href: "/settings/notifications", icon: MessageSquarePlus, match: (pathname) => pathname.startsWith("/settings/notifications") },
      { label: "Security", href: "/settings/security", icon: Shield, match: (pathname) => pathname.startsWith("/settings/security") },
    ],
  },
]

function getGroups(mode: MerchantSidebarMode) {
  return mode === "settings" ? settingsGroups : mainGroups
}

function isActive(pathname: string, item: NavItem) {
  return item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function MerchantSidebar({
  merchant,
  handleLogout,
  theme = "light",
  toggleTheme,
  mode = "main",
}: {
  merchant: Merchant
  handleLogout: () => void
  theme?: "dark" | "light"
  toggleTheme?: () => void
  mode?: MerchantSidebarMode
}) {
  const pathname = usePathname() ?? ""
  const groups = getGroups(mode)

  return (
    <Sidebar variant="inset" collapsible="offcanvas" className="border-r border-border/80 bg-background">
      <SidebarHeader className="gap-5 px-4 pt-7">
        <div className="px-2">
          <Logo size="sm" theme={theme} className="h-9 items-center" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="mb-8 last:mb-0">
            <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild tooltip={item.label} className={active ? "bg-accent/90 text-foreground shadow-sm" : ""}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator className="mx-4 my-0" />

      <SidebarFooter className="gap-2 px-4 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/feedback">
                <MessageSquarePlus />
                <span>Feedback</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings">
                <LayoutDashboard />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {toggleTheme ? (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={toggleTheme}>
                {theme === "dark" ? <Sun /> : <Moon />}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-muted/25 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{merchant.store_name}</p>
            <p className="truncate text-xs text-muted-foreground">Merchant Panel</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
