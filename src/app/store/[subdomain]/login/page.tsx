"use client"

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2, Eye, EyeOff, ArrowRight, ArrowLeft,
  Shield, Lock, Mail, ShoppingBag
} from 'lucide-react';
import { AuthSkeleton } from '@/components/StoreSkeletons';
import { StorefrontProviders } from '@/providers/storefront';
import { useStoreData } from '@/providers/storefront';
import { getStorefrontPath } from '@/lib/storefront/navigation';

function buildGoogleOAuthState(subdomain: string, redirect: string | null) {
  const state = JSON.stringify({
    subdomain,
    redirect: redirect === 'checkout' ? 'checkout' : '',
    nonce: crypto.randomUUID(),
    issuedAt: Date.now(),
  });
  document.cookie = [
    `store_oauth_state=${encodeURIComponent(state)}`,
    'Path=/',
    'Max-Age=600',
    'SameSite=Lax',
    window.location.protocol === 'https:' ? 'Secure' : '',
  ].filter(Boolean).join('; ');
  return state;
}

function BrandPanel({ storeName, logoUrl, subdomain }: {
  storeName: string;
  logoUrl?: string;
  subdomain: string;
}) {
  return (
    <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-10 xl:p-12 border-r border-zinc-100 bg-white sticky top-0 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={storeName} className="h-8 w-auto object-contain" />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="text-[15px] font-semibold text-zinc-900 tracking-tight">{storeName}</span>
      </div>

      {/* Main copy */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-5" style={{ background: 'color-mix(in srgb, var(--primary) 10%, white)', border: '1px solid color-mix(in srgb, var(--primary) 18%, white)' }}>
          <Shield className="w-3 h-3" style={{ color: 'var(--primary)' }} />
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>Customer Portal</span>
        </div>
        <h2 className="text-[32px] xl:text-[38px] font-semibold text-zinc-900 leading-[1.1] tracking-tight mb-4">
          Your account,<br />your orders.
        </h2>
        <p className="text-[15px] text-zinc-500 leading-relaxed max-w-xs">
          Sign in to track shipments, manage returns, and pick up where you left off.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <TrustItem icon={<Lock className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />} label="End-to-end encrypted" sub="Credentials never stored in plaintext" />
          <TrustItem icon={<Shield className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />} label="Session persists across tabs" sub="Stay signed in without interruption" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-6 border-t border-zinc-100">
        <Link href={getStorefrontPath(subdomain, '/', typeof window !== 'undefined' ? window.location.host : undefined)} className="flex items-center gap-1.5 transition-colors hover:opacity-80">
          <ArrowLeft className="w-3 h-3" /> Back to store
        </Link>
        <span>Self-hosted storefront</span>
      </div>
    </div>
  );
}

function TrustItem({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-100">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-[13px] font-semibold text-zinc-800">{label}</div>
        <div className="text-[12px] text-zinc-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function StoreLoginContent({ subdomain }: { subdomain: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get('reset');
  const redirectTo = searchParams.get('redirect');

  const { merchant, loading } = useStoreData();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [showResendVerification, setShowResendVerification] = useState(false);

  useEffect(() => {
    if (resetToken) setMode('reset');
  }, [resetToken]);

  const storeName = merchant?.store_name || subdomain;
  const logoUrl = typeof merchant?.branding_settings?.logo_url === 'string'
    ? merchant.branding_settings.logo_url
    : undefined;
  const googleClientId = typeof merchant?.auth_settings?.google_client_id === 'string'
    ? merchant.auth_settings.google_client_id
    : '';
  const googleLoginEnabled = Boolean(merchant?.auth_settings?.google_login_enabled && googleClientId);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setShowResendVerification(false);
    try {
      const response = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', subdomain, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.requiresVerification) setShowResendVerification(true);
        toast.error(data.error);
      } else {
        localStorage.setItem(`store_auth_${subdomain}`, JSON.stringify(data.session));
        toast.success('Logged in successfully!');
        router.push(redirectTo === 'checkout' ? getStorefrontPath(subdomain, '/checkout', window.location.host) : getStorefrontPath(subdomain, '/', window.location.host));
      }
    } catch {
      toast.error('Login failed');
    }
    setSubmitting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', subdomain, token: resetToken, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error);
      } else {
        toast.success(data.message);
        router.push(getStorefrontPath(subdomain, '/login', window.location.host));
      }
    } catch {
      toast.error('Failed to reset password');
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot_password', subdomain, email }),
      });
      const data = await response.json();
      if (!response.ok) toast.error(data.error);
      else toast.success(data.message);
    } catch {
      toast.error('Failed to send reset email');
    }
    setSubmitting(false);
  };

  const handleResendVerification = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend_verification', subdomain, email }),
      });
      const data = await response.json();
      toast.success(data.message);
    } catch {
      toast.error('Failed to resend verification email');
    }
    setSubmitting(false);
  };

  const handleGoogleLogin = () => {
    if (!googleClientId) { toast.error('Google login is not configured'); return; }
    const redirectUri = `${window.location.origin}/api/store/auth/google/callback`;
    const state = buildGoogleOAuthState(subdomain, redirectTo);
    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&state=${encodeURIComponent(state)}` +
      `&access_type=offline&prompt=consent`;
  };

  if (loading) return <AuthSkeleton />;
  if (!merchant) return null;

  return (
    <div className="min-h-screen flex bg-white text-zinc-900">
      <BrandPanel
        storeName={storeName}
        logoUrl={logoUrl}
        subdomain={subdomain}
      />

      {/* Right: Form pane */}
      <div className="flex-1 flex flex-col min-h-[100dvh] overflow-hidden bg-white">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <ShoppingBag className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[13px] font-semibold text-zinc-900 truncate max-w-[180px]">{merchant.store_name}</span>
          </div>
          <Link href={getStorefrontPath(subdomain, '/', typeof window !== 'undefined' ? window.location.host : undefined)} className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors">
            Exit
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 md:px-6 py-6 md:py-8">
          <div className="w-full max-w-sm md:max-w-md flex flex-col justify-center min-h-full">

            {/* Back link (desktop) */}
            {mode !== 'login' && (
              <button
                onClick={() => setMode('login')}
                className="flex items-center gap-1.5 text-[12px] text-zinc-400 transition-colors hover:opacity-80 mb-5 group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Back to sign in
              </button>
            )}

            {/* Heading */}
            <div className="mb-7 md:mb-6">
              <h1 className="text-[24px] md:text-[28px] font-semibold text-zinc-900 tracking-tight leading-tight mb-1.5">
                {mode === 'login' && 'Sign in'}
                {mode === 'forgot' && 'Reset password'}
                {mode === 'reset' && 'New password'}
              </h1>
              <p className="text-[13px] md:text-[14px] text-zinc-400 leading-relaxed">
                {mode === 'login' && 'Enter your credentials to continue.'}
                {mode === 'forgot' && "We'll send a secure reset link to your email."}
                {mode === 'reset' && 'Set a new password for your account.'}
              </p>
            </div>

            {/* --- LOGIN FORM --- */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 md:space-y-4">
                <FormField label="Email">
                  <FieldIcon><Mail className="w-4 h-4" /></FieldIcon>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 text-[14px] font-medium placeholder:text-zinc-300 outline-none focus:ring-2 transition-all" style={{ borderColor: 'var(--store-border)', boxShadow: '0 0 0 0 transparent' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--primary) 12%, white)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--store-border)'; e.currentTarget.style.boxShadow = '0 0 0 0 transparent'; }}
                  />
                </FormField>

                <FormField
                  label="Password"
                  action={
                    <button type="button" onClick={() => setMode('forgot')} className="text-[11px] text-zinc-400 transition-colors hover:opacity-80 pr-0.5">
                      Forgot?
                    </button>
                  }
                >
                  <FieldIcon><Lock className="w-4 h-4" /></FieldIcon>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-11 text-[14px] font-medium placeholder:text-zinc-300 outline-none focus:ring-2 transition-all" style={{ borderColor: 'var(--store-border)', boxShadow: '0 0 0 0 transparent' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--primary) 12%, white)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--store-border)'; e.currentTarget.style.boxShadow = '0 0 0 0 transparent'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-300 hover:text-zinc-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </FormField>

                {showResendVerification && (
                  <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[12px] font-medium text-amber-800 mb-1">Email not verified yet.</p>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={submitting}
                      className="text-[12px] font-semibold text-amber-700 underline underline-offset-4"
                    >
                      Resend verification link
                    </button>
                  </div>
                )}

                <div className="pt-3 space-y-3">
                  <PrimaryButton submitting={submitting} label="Sign in" />

                  {googleLoginEnabled && (
                    <>
                      <Divider />
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={submitting}
                        className="w-full h-11 bg-white border border-zinc-200 rounded-xl text-[13px] font-medium text-zinc-700 flex items-center justify-center gap-2.5 hover:bg-zinc-50 transition-colors"
                      >
                        <GoogleIcon />
                        Continue with Google
                      </button>
                    </>
                  )}
                </div>

                <p className="text-center text-[13px] text-zinc-400 pt-6">
                  No account yet?{' '}
                  <Link
                    href={`${getStorefrontPath(subdomain, '/signup', typeof window !== 'undefined' ? window.location.host : undefined)}${redirectTo ? `?redirect=${redirectTo}` : ''}`}
                    className="font-semibold transition-colors hover:opacity-80" style={{ color: 'var(--primary)' }}
                  >
                    Create one
                  </Link>
                </p>
              </form>
            )}

            {/* --- FORGOT FORM --- */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4 md:space-y-4">
                <FormField label="Email address">
                  <FieldIcon><Mail className="w-4 h-4" /></FieldIcon>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 text-[14px] font-medium placeholder:text-zinc-300 outline-none focus:ring-2 transition-all" style={{ borderColor: 'var(--store-border)', boxShadow: '0 0 0 0 transparent' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--primary) 12%, white)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--store-border)'; e.currentTarget.style.boxShadow = '0 0 0 0 transparent'; }}
                  />
                </FormField>
                <div className="pt-3">
                  <PrimaryButton submitting={submitting} label="Send reset link" />
                </div>
              </form>
            )}

            {/* --- RESET FORM --- */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4 md:space-y-4">
                <FormField label="New password">
                  <FieldIcon><Lock className="w-4 h-4" /></FieldIcon>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min. 6 characters"
                    minLength={6}
                    required
                    className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-11 text-[14px] font-medium placeholder:text-zinc-300 outline-none focus:ring-2 transition-all" style={{ borderColor: 'var(--store-border)', boxShadow: '0 0 0 0 transparent' }} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--primary) 12%, white)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--store-border)'; e.currentTarget.style.boxShadow = '0 0 0 0 transparent'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-300 hover:text-zinc-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </FormField>
                <div className="pt-3">
                  <PrimaryButton submitting={submitting} label="Confirm new password" />
                </div>
              </form>
            )}

          </div>
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden h-4 shrink-0 bg-white" />
      </div>
    </div>
  );
}

// ─── Small shared primitives ──────────────────────────────────────────────────

function FormField({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <Label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</Label>
        {action}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none">
      {children}
    </div>
  );
}

function PrimaryButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full h-11 active:scale-[0.99] disabled:opacity-60 text-white rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: 'var(--primary)' }}
    >
      {submitting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {label}
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-zinc-100" />
      <span className="text-[12px] text-zinc-300">or</span>
      <div className="flex-1 h-px bg-zinc-100" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Page entry point ─────────────────────────────────────────────────────────

export default function StoreLoginPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const resolvedParams = use(params);
  const subdomain = resolvedParams.subdomain;

  return (
    <StorefrontProviders subdomain={subdomain}>
      <Suspense fallback={<AuthSkeleton />}>
        <StoreLoginContent subdomain={subdomain} />
      </Suspense>
    </StorefrontProviders>
  );
}
