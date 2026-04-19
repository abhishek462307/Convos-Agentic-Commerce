"use client"

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SparklesCore } from '@/components/ui/aceternity/sparkles';
import { Spotlight } from '@/components/ui/aceternity/spotlight';

function getSafeReturnTo(returnTo: string | null): string | null {
  if (!returnTo || typeof window === 'undefined') return null;

  try {
    const url = new URL(returnTo, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname !== '/auth/mcp/success') return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [existingUser, setExistingUser] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const isMCPFlow = returnTo?.startsWith('/auth/mcp/success');

    React.useEffect(() => {
      async function checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setExistingUser(session.user);
          // Auto-redirect for MCP flow to save steps
          if (isMCPFlow && returnTo) {
            window.location.href = returnTo;
          }
        }
        setCheckingSession(false);
      }
      checkSession();
    }, [isMCPFlow, returnTo]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      if (returnTo) {
        window.location.href = returnTo;
        return;
      }
      router.push('/dashboard');
    }
  };

  const handleFastTrack = () => {
    if (returnTo) {
      window.location.href = returnTo;
    } else {
      router.push('/dashboard');
    }
  };

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-4" />
        <p className="text-zinc-500 text-sm">Verifying session...</p>
      </div>
    );
  }

  if (existingUser && isMCPFlow) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
          <div className="bg-emerald-500/20 p-3 rounded-full">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Already Logged In</p>
            <p className="text-sm text-zinc-400 mt-1">
              You are signed in as <span className="text-emerald-400 font-medium">{existingUser.email}</span>.
            </p>
          </div>
        </div>

        <Button 
          onClick={handleFastTrack}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-14 text-lg font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
        >
          Authorize Now
          <ArrowRight className="w-5 h-5" />
        </Button>

        <div className="text-center">
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
        {isMCPFlow && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-2 flex items-center gap-3">
            <div className="bg-violet-500/20 p-2 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Connecting to ChatGPT</p>
              <p className="text-xs text-zinc-400">Log in to authorize your store session.</p>
            </div>
          </div>
        )}
        
        {error && (

        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm font-medium border border-red-500/20 flex items-start gap-3">
          <span className="mt-0.5">⚠️</span>
          <p>{error}</p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-zinc-300">Email</Label>
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-zinc-300">Password</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">
            Forgot password?
          </Link>
        </div>
        <Input 
          id="password" 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 rounded-xl transition-all"
          required 
        />
      </div>

        <Button 
          type="submit" 
          className="w-full bg-white text-black hover:bg-zinc-200 h-11 font-bold rounded-xl shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2 mt-2" 
          disabled={loading}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              {isMCPFlow ? 'Authorize Connection' : 'Log in'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

      <div className="pt-6 text-center">
        <p className="text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link href="/signup" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
            Get started
          </Link>
        </p>
      </div>
    </form>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const isMCPFlow = returnTo?.startsWith('/auth/mcp/success');

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a0f] text-white flex">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <SparklesCore
            id="login-sparkles"
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
            className="max-w-md space-y-6"
          >
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                {isMCPFlow ? 'Secure Access for' : 'Welcome back to'}
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                {isMCPFlow ? 'ChatGPT MCP' : 'Convos'}
              </span>
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              {isMCPFlow 
                ? 'Your AI agent is ready to help you manage your store. Log in to securely authorize the connection.'
                : 'Your AI-powered commerce platform is waiting. Pick up where you left off.'}
            </p>
            
            <div className="space-y-3 pt-4">
              {(isMCPFlow ? [
                "Secure session token generation",
                "24-hour protected access",
                "End-to-end encrypted connection"
              ] : [
                "Real-time analytics dashboard",
                "AI conversation insights",
                "One-click product management"
              ]).map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  <span className="text-zinc-300 text-sm">{text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
            <div className="flex items-center gap-6 text-xs text-zinc-600">
              <span>End-to-end encrypted</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span>GDPR Ready</span>
            </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
          <div className="absolute inset-0 bg-[#0a0a0f]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.12),transparent)]" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px] relative z-10"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Logo size="md" />
            </Link>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isMCPFlow ? 'Authorize Connection' : 'Log in to your account'}
            </h2>
            <p className="text-zinc-500 text-sm">
              {isMCPFlow ? 'Authenticate to generate your session token' : 'Enter your credentials to access your dashboard'}
            </p>
          </div>

          <LoginForm />
          
            <p className="mt-8 text-center text-xs text-zinc-600 leading-relaxed">
              By logging in, you agree to our{' '}
              <Link href="/terms" className="text-zinc-500 hover:text-white transition-colors">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-zinc-500 hover:text-white transition-colors">Privacy Policy</Link>.
            </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="animate-spin text-zinc-600" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
