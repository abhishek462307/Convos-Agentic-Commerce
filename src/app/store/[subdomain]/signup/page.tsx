"use client"

import { useState, useEffect, use, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, UserPlus, Shield, Lock, Mail, User, Phone, Globe, Zap } from 'lucide-react';
import { AuthSkeleton } from '@/components/StoreSkeletons';
import { getStorefrontPath } from '@/lib/storefront/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { StorefrontProviders } from '@/providers/storefront';
import { useStoreData } from '@/providers/storefront';

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

function MatrixBranding({ storeName, logoUrl }: { storeName: string, logoUrl?: string | null }) {
  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col justify-between p-12 lg:p-20">
      <div className="absolute inset-0 bg-[#050505] -z-10" />
      <div 
        className="absolute inset-0 opacity-[0.07]" 
        style={{ 
          backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
        }}
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ 
          background: `radial-gradient(circle, var(--primary) 0%, transparent 70%)`,
          filter: 'blur(80px)'
        }}
      />
      <div className="z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-10 w-auto object-contain brightness-0 invert" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Globe className="w-6 h-6" />
            </div>
          )}
          <span className="text-xl font-bold tracking-tight text-white/90 uppercase">{storeName}</span>
        </motion.div>
      </div>
      <div className="z-10 max-w-md">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <UserPlus className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Protocol v4.0</span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Universal <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/50">Access.</span>
          </h2>
          <p className="text-white/40 text-lg font-medium leading-relaxed mb-8">
            Create your unique identity within the store network. One account, endless agentic possibilities.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Shield className="w-5 h-5 text-primary mb-2" />
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Security</div>
            <div className="text-sm font-bold text-white">Identity Guard</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Zap className="w-5 h-5 text-primary mb-2" />
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Network</div>
            <div className="text-sm font-bold text-white">Matrix Ready</div>
          </div>
        </div>
      </div>
      <div className="z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-white/20" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Identity Encryption Active</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)] animate-pulse" />
      </div>
    </div>
  );
}

function StoreSignupContent({ subdomain }: { subdomain: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const { merchant, loading } = useStoreData();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const authSettings = (merchant?.auth_settings ?? {}) as Record<string, unknown>;
  const googleClientId = typeof authSettings.google_client_id === 'string' ? authSettings.google_client_id : '';
  const googleLoginEnabled = authSettings.google_login_enabled === true;


  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49' },
    { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
    { code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', dial: '+81' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '+55' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '+52' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '+31' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '+46' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴', dial: '+47' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰', dial: '+45' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮', dial: '+358' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dial: '+41' },
    { code: 'AT', name: 'Austria', flag: '🇦🇹', dial: '+43' },
    { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '+32' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪', dial: '+353' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial: '+64' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', dial: '+65' },
    { code: 'HK', name: 'Hong Kong', flag: '🇬🇰', dial: '+852' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷', dial: '+82' },
    { code: 'CN', name: 'China', flag: '🇨🇳', dial: '+86' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial: '+966' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '+27' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬', dial: '+20' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial: '+63' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dial: '+62' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dial: '+60' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭', dial: '+66' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dial: '+84' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dial: '+92' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dial: '+880' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺', dial: '+7' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱', dial: '+48' },
    { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dial: '+380' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷', dial: '+90' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '+54' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', dial: '+56' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial: '+57' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪', dial: '+51' },
  ];

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = countries.find(c => c.code === country);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', subdomain, email, password, name, phone, country })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error);
      } else {
        if (data.requiresVerification === false) {
          toast.success(data.message);
          router.push(`${getStorefrontPath(subdomain, '/login', window.location.host)}${redirectTo ? `?redirect=${redirectTo}` : ''}`);
        } else {
          setStep('otp');
          setResendCooldown(60);
          setTimeout(() => otpRefs.current[0]?.focus(), 100);
        }
      }
    } catch (error) {
      toast.error('Signup failed');
    }
    setSubmitting(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', subdomain, email, otp: otpCode })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error);
      } else {
        toast.success(data.message);
        router.push(`${getStorefrontPath(subdomain, '/login', window.location.host)}${redirectTo ? `?redirect=${redirectTo}` : ''}`);
      }
    } catch (error) {
      toast.error('Verification failed');
    }
    setSubmitting(false);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setSubmitting(true);

    try {
      const response = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend_verification', subdomain, email })
      });

      const data = await response.json();
      toast.success(data.message);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (error) {
      toast.error('Failed to resend code');
    }
    setSubmitting(false);
  };

  const handleGoogleLogin = () => {
    const clientId = googleClientId;

    if (!clientId) {
      toast.error('Google login is not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/api/store/auth/google/callback`;
    const scope = 'openid email profile';
    const state = buildGoogleOAuthState(subdomain, redirectTo);

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    window.location.href = googleAuthUrl;
  };

  if (loading) return <AuthSkeleton />;
  if (!merchant) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] flex overflow-hidden">
      {/* Split Layout: Left Panel */}
      <div className="hidden lg:block lg:w-[45%] xl:w-[40%] sticky top-0 h-screen">
        <MatrixBranding storeName={merchant.store_name} logoUrl={merchant.branding_settings?.logo_url} />
      </div>

      {/* Right Panel: Form Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="lg:hidden p-6 border-b border-zinc-100 dark:border-zinc-900 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm uppercase tracking-tight">{merchant.store_name}</span>
          </div>
          <Link href={getStorefrontPath(subdomain, '/login', typeof window !== 'undefined' ? window.location.host : undefined)} className="text-xs font-bold text-zinc-400 hover:text-primary transition-colors">
            Exit
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 max-w-4xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex mb-12"
          >
            <Link 
              href={getStorefrontPath(subdomain, '/login', typeof window !== 'undefined' ? window.location.host : undefined)}
              className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              Sign in instead
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-10">
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                {step === 'otp' ? 'Verification' : 'Join Network'}
              </h1>
              <p className="text-zinc-500 text-lg font-medium">
                {step === 'otp' ? `We've sent a code to ${email}` : 'Initialize your universal matrix profile today.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === 'otp' ? (
                <motion.div 
                  key="otp"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <div className="flex justify-between gap-3 w-full">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-full aspect-[4/5] text-center text-[24px] font-black border-2 border-zinc-100 dark:border-zinc-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl outline-none transition-all"
                      />
                    ))}
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleVerifyOtp}
                      disabled={submitting || otp.join('').length !== 6}
                      className="w-full h-15 text-white text-[16px] font-black flex items-center justify-center gap-3 disabled:opacity-70 shadow-xl transition-all"
                      style={{ 
                        background: 'var(--primary)',
                        borderRadius: '20px',
                      }}
                    >
                      {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>Complete Setup <ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>

                    <div className="flex flex-col items-center gap-4 pt-4">
                      <button 
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || submitting}
                        className="text-[12px] font-black uppercase tracking-widest transition-colors"
                        style={{ color: resendCooldown > 0 ? '#cbd5e1' : 'var(--primary)' }}
                      >
                        {resendCooldown > 0 ? `Retry in ${resendCooldown}s` : 'Resend Code'}
                      </button>

                      <button
                        onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']); }}
                        className="text-[12px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        Back to form
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onSubmit={handleSignup} 
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 px-1">Legal Name</Label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 h-14 pl-12 pr-6 rounded-2xl text-[15px] font-bold outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 px-1">Network Email</Label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 h-14 pl-12 pr-6 rounded-2xl text-[15px] font-bold outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                          placeholder="name@matrix.com"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 px-1">Communication Link</Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCountryPicker(!showCountryPicker)}
                        className="flex items-center justify-center gap-2 h-14 px-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 hover:border-primary/40 transition-all shadow-sm group shrink-0"
                      >
                        <span className="text-lg">{selectedCountry?.flag || '🌐'}</span>
                      </button>
                      <div className="group relative flex-1">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors">
                          <Phone className="w-5 h-5" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 h-14 pl-12 pr-6 rounded-2xl text-[15px] font-bold outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                          placeholder={selectedCountry ? `${selectedCountry.dial} 0000 000 000` : 'Phone Number'}
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {showCountryPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 right-0 top-[110%] z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-2 border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden rounded-2xl mx-6 lg:mx-0"
                        >
                          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                            <input
                              type="text"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              placeholder="Search country..."
                              className="w-full px-4 h-11 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm outline-none font-bold"
                              autoFocus
                            />
                          </div>
                          <div className="overflow-y-auto max-h-[300px] p-2">
                            {filteredCountries.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setCountry(c.code);
                                  setShowCountryPicker(false);
                                }}
                                className="w-full px-4 py-3 flex items-center gap-4 transition-all hover:bg-primary/5 rounded-xl text-left"
                              >
                                <span className="text-xl">{c.flag}</span>
                                <span className="text-[13px] font-black flex-1 uppercase tracking-tight">{c.name}</span>
                                <span className="text-[11px] font-bold text-zinc-400">{c.dial}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-zinc-400 px-1">Security Key</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-primary transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 h-14 pl-12 pr-12 rounded-2xl text-[15px] font-bold outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                        placeholder="min. 6 characters"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 space-y-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-15 text-white text-[16px] font-black flex items-center justify-center gap-3 shadow-xl hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                      style={{ 
                        background: 'var(--primary)',
                        borderRadius: '20px',
                      }}
                    >
                      {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>Establish Identity <ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>

                    {googleLoginEnabled && googleClientId && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleGoogleLogin}
                        className="w-full h-15 border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[14px] font-black flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all rounded-[20px]"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        OAUTH Signup
                      </button>
                    )}
                  </div>

                  <div className="pt-8 text-center">
                    <p className="text-[13px] text-zinc-500 font-bold">
                      Already have an identity?{' '}
                      <Link
                        href={`${getStorefrontPath(subdomain, '/login', typeof window !== 'undefined' ? window.location.host : undefined)}${redirectTo ? `?redirect=${redirectTo}` : ''}`}
                        className="text-primary font-black hover:underline underline-offset-4 decoration-2"
                        style={{ color: 'var(--primary)' }}
                      >
                        Sign In Terminal
                      </Link>
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="p-8 mt-auto text-center border-t border-zinc-50 dark:border-zinc-900/50">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-700">
            Secure onboarding for your storefront
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StoreSignupPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const resolvedParams = use(params);
  const subdomain = resolvedParams.subdomain;

  return (
    <StorefrontProviders subdomain={subdomain}>
      <Suspense fallback={<AuthSkeleton />}>
        <StoreSignupContent subdomain={subdomain} />
      </Suspense>
    </StorefrontProviders>
  );
}
