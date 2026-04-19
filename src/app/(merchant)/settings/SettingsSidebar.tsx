"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import {
  Store,
  Zap,
  Brain,
  Trash2,
  ArrowLeft,
  MessageSquare,
  Search,
  Bell,
  Banknote,
  MessageSquarePlus,
  Settings2,
  Sun,
  Moon,
  LogOut,
  Globe,
  KeyRound,
  Shield,
  Truck,
  Upload,
  Key,
  Mail,
  ServerCog,
} from 'lucide-react';
import { useMerchant } from '@/hooks/use-merchant';
import { supabase } from '@/lib/supabase';

const settingsNav = [
  {
    group: 'Storefront',
    items: [
      { href: '/settings', icon: Store, label: 'Store & Region' },
      { href: '/settings/domain', icon: Globe, label: 'Custom Domain' },
      { href: '/settings/seo', icon: Search, label: 'SEO & Discovery' },
      { href: '/settings/login', icon: KeyRound, label: 'Customer Login' },
    ]
  },
  {
    group: 'AI Intelligence',
    items: [
      { href: '/settings/ai', icon: Brain, label: 'AI Intelligence' },
      { href: '/settings/ai-keys', icon: Key, label: 'AI API Keys (BYOK)' },
      { href: '/whatsapp-commerce', icon: MessageSquare, label: 'WhatsApp Commerce' },
      { href: '/settings/mcp', icon: MessageSquarePlus, label: 'ChatGPT MCP' },
      { href: '/settings/automation', icon: Zap, label: 'Automation' },
    ]
  },
  {
    group: 'Sales & Logistics',
    items: [
      { href: '/settings/payments', icon: Banknote, label: 'Payment Methods' },
      { href: '/settings/shipping', icon: Truck, label: 'Shipping & Taxes' },
      { href: '/settings/import', icon: Upload, label: 'Product Import' },
    ]
  },
  {
    group: 'Workspace',
    items: [
      { href: '/settings/email', icon: Mail, label: 'Email Settings (SMTP)' },
      { href: '/settings/notifications', icon: Bell, label: 'Notifications' },
      { href: '/settings/self-host', icon: ServerCog, label: 'Self-Host Setup' },
      { href: '/settings/security', icon: Shield, label: 'Security' },
    ]
  }
];

export function SettingsSidebar({
  theme = 'dark',
  toggleTheme,
}: {
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
}) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const {
    merchant,
  } = useMerchant();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/settings') return pathname === '/settings';
    return pathname.startsWith(href);
  };

  if (!merchant) return null;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header matching SidebarContent */}
      <div className="flex items-center px-4 pb-2 pt-7">
        <div className="px-2">
          <Logo size="sm" theme={theme} className="h-9 items-center" />
        </div>
      </div>

      <div className="px-4 pb-4 pt-4">
        <Link 
          href="/dashboard" 
          className="group flex h-11 items-center gap-3 rounded-xl bg-secondary/40 px-3.5 py-2 text-xs font-bold tracking-tight text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {settingsNav.map((section) => (
          <div key={section.group} className="mb-7 last:mb-0">
            <div className="mb-2.5 px-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                {section.group}
              </p>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex h-10 items-center gap-3.5 rounded-xl px-3 transition-all duration-200 ${
                      active
                        ? 'bg-accent/90 text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground/80 group-hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-[17px] w-[17px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13.5px] tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>
                        {item.label}
                      </p>
                    </div>
                    {active && (
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/80" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-6 border-t border-border/50 px-1 mt-6">
          <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400">
            <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Delete Store</span>
          </button>
        </div>
      </nav>

      {/* Footer matching SidebarContent */}
      <div className="border-t border-border px-3 py-4 space-y-0.5 md:hidden">
        <Link
          href="/feedback"
          className={`group flex h-9 items-center gap-3 rounded-lg px-3 transition-colors ${
            pathname === '/feedback'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
          </div>
          <span className="text-[13px] font-semibold">Feedback</span>
        </Link>

        <Link
          href="/settings"
          className={`group flex h-9 items-center gap-3 rounded-lg px-3 transition-colors ${
            pathname.startsWith('/settings')
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <Settings2 className="h-4 w-4 shrink-0" />
          </div>
          <span className="text-[13px] font-semibold">Settings</span>
        </Link>

        {toggleTheme && (
          <button
            onClick={toggleTheme}
            className="group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <div className="flex h-5 w-5 items-center justify-center">
              {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            </div>
            <span className="text-[13px] font-semibold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}

        <button
          onClick={handleLogout}
          className="group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-destructive"
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <LogOut className="h-4 w-4 shrink-0" />
          </div>
          <span className="text-[13px] font-semibold">Log out</span>
        </button>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/25 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Account</p>
            <p className="truncate text-xs text-muted-foreground">Merchant Panel</p>
          </div>
        </div>
      </div>
    </div>
  );
}
