"use client"

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useMerchant } from '@/hooks/use-merchant';
import { 
  ExternalLink,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Package,
  Search,
  Sparkles,
  Settings,
  ShoppingBag,
  Store,
  LogOut,
  Moon,
  Sun,
  Settings2,
  MessageSquarePlus,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { SidebarContent } from './SidebarContent';
import { SettingsSidebar } from './settings/SettingsSidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { AICommandSidebar } from '@/components/merchant/AICommandSidebar';
import { ConvosAiLauncher } from '@/components/merchant/convos-ai-launcher';
import { FloatingDock } from '@/components/merchant/FloatingDock';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { Input } from '@/components/ui/input';

const mobileBottomNavItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, match: (pathname: string) => pathname === '/dashboard' },
  { href: '/orders', label: 'Orders', icon: ShoppingBag, match: (pathname: string) => pathname.startsWith('/orders') },
  { href: '/products', label: 'Catalog', icon: Package, match: (pathname: string) => pathname.startsWith('/products') || pathname.startsWith('/categories') || pathname.startsWith('/collections') },
  { href: '/conversations', label: 'Inbox', icon: MessageSquare, match: (pathname: string) => pathname.startsWith('/conversations') },
  { href: '/settings', label: 'Settings', icon: Settings, match: (pathname: string) => pathname.startsWith('/settings') },
];

const merchantSections = [
  { label: 'Overview', group: 'Dashboard', match: (pathname: string) => pathname === '/dashboard' },
  { label: 'Orders', group: 'Commerce', match: (pathname: string) => pathname.startsWith('/orders') },
  { label: 'Catalog', group: 'Commerce', match: (pathname: string) => pathname.startsWith('/products') || pathname.startsWith('/categories') || pathname.startsWith('/collections') },
  { label: 'Customers', group: 'Commerce', match: (pathname: string) => pathname.startsWith('/customers') },
  { label: 'Conversations', group: 'AI Operations', match: (pathname: string) => pathname.startsWith('/conversations') },
  { label: 'Marketing', group: 'Growth', match: (pathname: string) => pathname.startsWith('/marketing') || pathname.startsWith('/discounts') },
  { label: 'Analytics', group: 'Growth', match: (pathname: string) => pathname.startsWith('/analytics') || pathname.startsWith('/reports') },
  { label: 'Settings', group: 'Configuration', match: (pathname: string) => pathname.startsWith('/settings') },
];

function getMerchantSection(pathname: string) {
  return merchantSections.find((section) => section.match(pathname)) ?? { label: 'Merchant Panel', group: 'Operations' };
}

function SearchParamsSync({ onSearchChange }: { onSearchChange: (val: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.get('search') || '';
    onSearchChange(query);
  }, [searchParams, onSearchChange]);

  return null;
}

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [shellSearch, setShellSearch] = useState('');
  const { theme, toggleTheme } = useMerchantTheme();
  const {
    merchant,
    context,
    loading,
    status,
  } = useMerchant();

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (status === 401) {
      router.push('/login');
      return;
    }


    if (!merchant) {
      router.push('/setup');
    }
  }, [loading, merchant, router, status]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleShellSearch = () => {
    const query = shellSearch.trim();
    const targetPath = pathname?.startsWith('/customers') 
      ? '/customers' 
      : pathname?.startsWith('/products') || pathname?.startsWith('/categories') || pathname?.startsWith('/collections')
      ? '/products'
      : pathname?.startsWith('/conversations')
      ? '/conversations'
      : '/orders';

    if (!query) {
      router.push(targetPath);
      return;
    }

    router.push(`${targetPath}?search=${encodeURIComponent(query)}`);
  };

  const activeSection = getMerchantSection(pathname ?? '');
  const shellSurfaceClassName =
    theme === 'light'
      ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),transparent_34%),linear-gradient(180deg,#f3f4ef_0%,#f8f8f5_26%,#f3f4ef_100%)]'
      : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,#050505_0%,#090909_100%)]';

  if (loading) {
      return (
      <div className={`${theme} merchant-panel flex flex-col md:flex-row h-screen bg-background text-foreground overflow-hidden font-sans`} suppressHydrationWarning>
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-background border-b border-border z-40">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </header>

        <aside className="hidden md:flex w-[264px] bg-background flex-col shrink-0 p-4 gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-background selection:bg-white selection:text-black">
            <div className="min-h-full p-6 lg:p-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[320px] w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!merchant) {
    return null;
  }

    return (
      <div className={`${theme} merchant-panel flex min-h-[100dvh] flex-col bg-background text-foreground font-sans md:h-[100dvh] md:overflow-hidden`}>
          <Suspense fallback={null}>
            <SearchParamsSync onSearchChange={setShellSearch} />
          </Suspense>

          {/* Mobile Header */}
          {!pathname?.startsWith('/store-design') && (
            <header className="md:hidden flex items-center justify-between border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur z-40">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card">
                  <Store className="w-4 h-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {merchant.store_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {activeSection.label}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setAiOpen(true)}>
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[304px] border-r border-border bg-background p-0">
                    {pathname?.startsWith('/settings') ? (
                      <SettingsSidebar theme={theme} toggleTheme={toggleTheme} />
                    ) : (
                      <SidebarContent
                        merchant={merchant}
                            handleLogout={handleLogout}
                            onClose={() => setIsMobileMenuOpen(false)}
                        theme={theme}
                        toggleTheme={toggleTheme}
                      />
                    )}
                  </SheetContent>
                </Sheet>
              </div>
            </header>
          )}

          <div className={`min-w-0 min-h-0 flex-1 ${pathname?.startsWith('/store-design') ? 'flex' : 'flex flex-col md:flex-row'}`}>
            {!pathname?.startsWith('/store-design') && (
              <aside className="hidden w-[264px] shrink-0 border-r border-border bg-background md:block md:h-full md:overflow-y-auto">
                {pathname?.startsWith('/settings') ? (
                  <SettingsSidebar theme={theme} toggleTheme={toggleTheme} />
                ) : (
                  <SidebarContent
                    merchant={merchant}
                    handleLogout={handleLogout}
                    theme={theme}
                    toggleTheme={toggleTheme}
                  />
                )}
              </aside>
            )}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {!pathname?.startsWith('/store-design') && (
                <div className="hidden border-b border-border/80 bg-background/90 backdrop-blur-xl md:block">
                  <div className="mx-auto grid w-full max-w-[1640px] grid-cols-[1fr_auto] items-center gap-8 px-6 py-4 lg:px-8">
                    <div className="relative flex-1 max-w-2xl">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
                      <Input
                        value={shellSearch}
                        onChange={(event) => setShellSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            handleShellSearch();
                          }
                        }}
                        placeholder="Search orders, missions, or intelligence..."
                        className="h-12 w-full rounded-2xl border-border/70 bg-card pl-11 shadow-sm transition-all focus:bg-card focus:ring-1 focus:ring-primary/20"
                      />
                    </div>

                        <div className="flex items-center justify-end gap-4">
                          <div className="flex h-11 min-w-[180px] max-w-[240px] items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 shadow-sm">
                            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                              {merchant.store_name}
                            </p>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Live
                            </span>
                          </div>

                              {(() => {
                                const hostname = typeof window !== 'undefined' ? window.location.host : '';
                                const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');
                                const isMainDomain = ['localhost', '127.0.0.1', 'vercel.app'].some(d => hostname.includes(d));
                                
                                // Use custom domain if verified AND not on localhost, otherwise use subdomain/path
                                const storefrontUrl = (merchant.domain_verified && merchant.custom_domain && !isLocal)
                                  ? `https://${merchant.custom_domain}`
                                  : isMainDomain 
                                    ? `/store/${merchant.subdomain}` 
                                    : `https://${merchant.subdomain}`;


                              return (
                                <Link href={storefrontUrl} target="_blank">
                                  <Button variant="outline" className="h-11 min-w-[130px] rounded-2xl border-border/70 px-4">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Storefront
                                  </Button>
                                </Link>
                              );
                            })()}

                          <ConvosAiLauncher theme={theme} onClick={() => setAiOpen(true)} />

                      <div className="h-8 w-px bg-border/60 mx-1" />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-11 w-11 rounded-2xl border border-border/70 bg-card p-0 hover:bg-accent transition-all">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                              {merchant.store_name?.charAt(0) || 'M'}
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/80 bg-background/95 backdrop-blur-xl">
                          <div className="px-3 py-3 border-b border-border/60 mb-1">
                            <p className="text-sm font-bold text-foreground truncate">{merchant.store_name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Merchant Panel</p>
                          </div>
                          <DropdownMenuLabel className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                            My Account
                          </DropdownMenuLabel>
                          <DropdownMenuGroup>
                            <Link href="/settings">
                              <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-accent focus:text-accent-foreground">
                                <Settings2 className="mr-3 h-4 w-4" />
                                <span className="font-semibold text-sm">Settings</span>
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-accent focus:text-accent-foreground">
                              <CreditCard className="mr-3 h-4 w-4" />
                              <span className="font-semibold text-sm">Billing</span>
                            </DropdownMenuItem>
                            <Link href="/feedback">
                              <DropdownMenuItem className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-accent focus:text-accent-foreground">
                                <MessageSquarePlus className="mr-3 h-4 w-4" />
                                <span className="font-semibold text-sm">Send Feedback</span>
                              </DropdownMenuItem>
                            </Link>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="my-1 bg-border/60" />
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={toggleTheme} className="rounded-xl px-3 py-2.5 cursor-pointer focus:bg-accent focus:text-accent-foreground">
                              {theme === 'dark' ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
                              <span className="font-semibold text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="my-1 bg-border/60" />
                          <DropdownMenuItem onClick={handleLogout} className="rounded-xl px-3 py-2.5 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <LogOut className="mr-3 h-4 w-4" />
                            <span className="font-semibold text-sm">Log out</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                </div>
              </div>
              )}

            {/* Main Content Area */}
            <main className={`flex-1 min-h-0 ${pathname?.startsWith('/store-design') ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'} ${shellSurfaceClassName}`}>
              <div className={`min-h-full ${pathname?.startsWith('/store-design') ? 'h-full pb-0' : 'pb-24 md:pb-0'}`}>
                {children}
              </div>
            </main>
            </div>
          </div>

          {!pathname?.startsWith('/store-design') && <FloatingDock />}

          <AICommandSidebar merchant={merchant} merchantContext={context} open={aiOpen} onOpenChange={setAiOpen} theme={theme} />

          {!aiOpen && !isMobileMenuOpen && !pathname?.startsWith('/store-design') && (
            <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 md:hidden">
              <nav className="mx-auto grid w-full max-w-[320px] grid-cols-5 gap-1 rounded-[24px] border border-border/80 bg-background/95 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.14)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
                {mobileBottomNavItems.map((item) => {
                  const isActive = item.match(pathname ?? '');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex flex-col items-center justify-center gap-0.5 rounded-[18px] px-1.5 py-1.5 text-[10px] font-medium transition-colors ${
                        isActive
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
      </div>

  );
}
