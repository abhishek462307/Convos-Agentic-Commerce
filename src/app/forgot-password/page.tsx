"use client"

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SparklesCore } from '@/components/ui/aceternity/sparkles';
import { Spotlight } from '@/components/ui/aceternity/spotlight';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <SparklesCore
            id="forgot-sparkles"
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
                Reset your
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                password
              </span>
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              We'll send you a link to reset your password and get you back to your dashboard.
            </p>
          </motion.div>
          
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <span>Secure password reset</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>Link expires in 1 hour</span>
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
          className="w-full max-w-[400px] relative z-10"
        >
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Logo size="md" />
            </Link>
          </div>

          {success ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                <p className="text-zinc-500 text-sm">
                  We've sent a password reset link to <span className="text-white">{email}</span>
                </p>
              </div>
              <p className="text-zinc-500 text-sm">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setSuccess(false)} 
                  className="text-violet-400 hover:text-violet-300 transition-colors"
                >
                  try again
                </button>
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full h-11 rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">Forgot password?</h2>
                <p className="text-zinc-500 text-sm">Enter your email and we'll send you a reset link</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm font-medium border border-red-500/20 flex items-start gap-3">
                    <span className="mt-0.5">!</span>
                    <p>{error}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@company.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 rounded-xl transition-all"
                      required 
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-white text-black hover:bg-zinc-200 h-11 font-semibold rounded-xl shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset link'}
                </Button>

                <div className="pt-4 text-center">
                  <Link href="/login" className="text-sm text-zinc-500 hover:text-white transition-colors inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
