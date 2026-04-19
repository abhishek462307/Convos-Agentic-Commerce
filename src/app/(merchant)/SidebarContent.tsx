"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bot,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  MessageSquare,
  MessageSquarePlus,
  Moon,
  Package,
  Rocket,
  Settings2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Star,
  Sun,
  Target,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import type { Merchant } from '@/types';

interface SidebarContentProps {
  merchant: Merchant;
  handleLogout: () => void;
  onClose?: () => void;
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  matches?: (pathname: string) => boolean;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [
      { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Conversations', href: '/conversations', icon: MessageSquare },
      { label: 'AI Authority', href: '/ai-authority', icon: Shield },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Orders', href: '/orders', icon: ShoppingBag, matches: (pathname) => pathname.startsWith('/orders') },
      {
        label: 'Catalog',
        href: '/products',
        icon: Package,
        matches: (pathname) =>
          pathname.startsWith('/products') || pathname.startsWith('/categories') || pathname.startsWith('/collections'),
      },
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Shipments', href: '/shipments', icon: Truck },
      { label: 'Store Design', href: '/store-design', icon: LayoutTemplate },
      { label: 'Reviews', href: '/reviews', icon: Star },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Campaigns', href: '/marketing/campaigns', icon: Rocket, matches: (pathname) => pathname.startsWith('/marketing/campaigns') },
      { label: 'Segments', href: '/marketing/segments', icon: Target, matches: (pathname) => pathname.startsWith('/marketing/segments') },
      { label: 'Email', href: '/marketing/email', icon: Mail, matches: (pathname) => pathname.startsWith('/marketing/email') },
      { label: 'WhatsApp', href: '/marketing/whatsapp', icon: MessageSquare, matches: (pathname) => pathname.startsWith('/marketing/whatsapp') },
      { label: 'Discounts', href: '/discounts', icon: ShoppingCart },
      { label: 'Analytics', href: '/analytics', icon: TrendingUp },
      { label: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'WA Commerce', href: '/whatsapp-commerce', icon: ShoppingCart },
      { label: 'MCP', href: '/mcp', icon: Bot },
    ],
  },
];

function isActiveItem(pathname: string, item: NavItem) {
  if (item.matches) {
    return item.matches(pathname);
  }

  if (item.href === '/dashboard') {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarContent({
  handleLogout,
  onClose,
  theme = 'light',
  toggleTheme,
}: SidebarContentProps) {
  const pathname = usePathname() ?? '';

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <div className="flex items-center px-4 pb-2 pt-7">
        <div className="px-2">
          <Logo size="sm" theme={theme} className="h-9 items-center" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
        {navGroups.map((group) => (
          <section key={group.label} className="mb-8 last:mb-0">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActiveItem(pathname, item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex h-11 items-center gap-3.5 rounded-xl px-3 transition-all duration-200 ${
                      active
                        ? 'bg-accent/90 text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        active 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground/80 group-hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[14px] tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>{item.label}</p>
                    </div>
                    {active ? (
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/80" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-4 space-y-0.5 md:hidden">
        <Link
          href="/feedback"
          onClick={onClose}
          className={`group flex h-10 items-center gap-3.5 rounded-xl px-3 transition-all duration-200 ${
            pathname === '/feedback'
              ? 'bg-accent text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <MessageSquarePlus className="h-[18px] w-[18px] shrink-0" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Feedback</span>
        </Link>

        <Link
          href="/settings"
          onClick={onClose}
          className={`group flex h-10 items-center gap-3.5 rounded-xl px-3 transition-all duration-200 ${
            pathname.startsWith('/settings')
              ? 'bg-accent text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <Settings2 className="h-[18px] w-[18px] shrink-0" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Settings</span>
        </Link>

        {toggleTheme && (
          <button
            onClick={toggleTheme}
            className="group flex h-10 w-full items-center gap-3.5 rounded-xl px-3 text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
          >
            <div className="flex h-5 w-5 items-center justify-center">
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px] shrink-0" /> : <Moon className="h-[18px] w-[18px] shrink-0" />}
            </div>
            <span className="text-[14px] font-semibold tracking-tight">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}

        <button
          onClick={handleLogout}
          className="group flex h-10 w-full items-center gap-3.5 rounded-xl px-3 text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-destructive"
        >
          <div className="flex h-5 w-5 items-center justify-center">
            <LogOut className="h-[18px] w-[18px] shrink-0" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Log out</span>
        </button>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/25 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
            <Users className="h-4 w-4 text-muted-foreground" />
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
