"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Sparkles, Zap, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SparklesCore } from '@/components/ui/aceternity/sparkles';
import { Spotlight } from '@/components/ui/aceternity/spotlight';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      if (data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email already exists. Please log in instead.');
        setLoading(false);
        return;
      }
      
      if (data.session) {
        router.push('/setup');
      } else {
        setStep('otp');
        setResendCooldown(60);
        setLoading(false);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, 8);
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 8) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 7);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 7) {
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
    if (otpCode.length !== 8) {
      setError('Please enter the complete 8-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push('/setup');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      setError(error.message);
    } else {
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '', '', '']);
    }
    setLoading(false);
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Fast Setup",
      description: "Import your products and go live in under 5 minutes."
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "AI Sales Agent",
      description: "A digital twin of your best salesperson, active 24/7."
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Enterprise Grade",
      description: "Secure payments and data protection built-in."
    }
  ];

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white flex">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <SparklesCore
            id="signup-sparkles"
            background="transparent"
            minSize={0.4}
            maxSize={0.8}
            particleDensity={20}
            particleColor="#8b5cf6"
          />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(139,92,246,0.15),transparent)]" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <Link href="/">
              <Logo size="md" />
            </Link>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-md space-y-8"
          >
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Build your store in
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                the age of AI
              </span>
            </h1>
            
            <div className="space-y-5">
              {features.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="mt-0.5 bg-violet-500/20 p-2.5 rounded-xl h-fit border border-violet-500/20">
                    <span className="text-violet-400">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <span>© 2026 Convos</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>Single-merchant self-host</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.1),transparent)]" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] relative z-10"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Logo size="md" />
            </Link>
          </div>

          {step === 'otp' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <button
                onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '', '', '']); setError(null); }}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              
              <div className="mx-auto w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Verify your email</h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                We sent an 8-digit code to<br />
                <span className="text-white font-medium">{email}</span>
              </p>

              {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm font-medium border border-red-500/20 mb-6">
                  {error}
                </div>
              )}

              <div className="flex justify-center gap-1.5 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-10 h-12 text-center text-lg font-bold bg-zinc-900/50 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyOtp}
                className="w-full bg-white text-black hover:bg-zinc-200 h-11 font-semibold rounded-xl shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2"
                disabled={loading || otp.join('').length !== 8}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Verify & Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <div className="mt-6">
                <p className="text-zinc-500 text-sm">
                  Didn't receive the code?{' '}
                  <button
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className={`font-semibold transition-colors ${
                      resendCooldown > 0 ? 'text-zinc-600 cursor-not-allowed' : 'text-violet-400 hover:text-violet-300'
                    }`}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
                <p className="text-zinc-500 text-sm">Create your merchant owner account.</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm font-medium border border-red-500/20">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">Work Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 rounded-xl transition-all"
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-300">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 rounded-xl transition-all"
                    required 
                  />
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    className="mt-1 rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500/50 focus:ring-offset-0" 
                    required 
                  />
                    <label htmlFor="terms" className="text-xs text-zinc-500 leading-relaxed">
                      I agree to the{' '}
                      <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms of Service</Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link>
                    </label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-white text-black hover:bg-zinc-200 h-11 font-semibold rounded-xl shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 mt-2" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      Create Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="pt-6 text-center">
                  <p className="text-sm text-zinc-500">
                    Already have an account?{' '}
                    <Link href="/login" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
                      Log in
                    </Link>
                  </p>
                </div>
              </form>
            
              <div className="mt-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Self-hosted commerce</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
