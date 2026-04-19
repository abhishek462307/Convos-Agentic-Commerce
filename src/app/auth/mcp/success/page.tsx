"use client"

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ShieldCheck, Key, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { motion } from 'framer-motion';

function MCPSuccessContent() {
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const merchantId = searchParams.get('merchantId');
  const router = useRouter();

  const copyToClipboard = useCallback(() => {
    if (sessionToken) {
      navigator.clipboard.writeText(sessionToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [sessionToken]);

  useEffect(() => {
    async function fetchSession() {
      if (!merchantId) {
        setLoading(false);
        setError("Missing merchantId parameter");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const returnTo = encodeURIComponent(window.location.href);
        router.push(`/login?returnTo=${returnTo}`);
        return;
      }

      try {
        const res = await fetch(`/api/mcp/session?merchantId=${merchantId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        const data = await res.json();
        
        if (data.sessionToken) {
          setSessionToken(data.sessionToken);
          
          // Also fetch store name
          const { data: merchant } = await supabase
            .from('merchants')
            .select('store_name')
            .eq('id', merchantId)
            .single();
          
          if (merchant) setStoreName(merchant.store_name);
        } else {
          setError(data.error || "Failed to generate session token");
        }
      } catch {
        setError("Network error generating token");
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [merchantId, router]);

  // Auto-copy on load if possible
  useEffect(() => {
    if (sessionToken && !loading) {
      const timer = setTimeout(() => {
        copyToClipboard();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [sessionToken, loading, copyToClipboard]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-violet-500" />
          </div>
        </div>
        <p className="text-zinc-400 font-medium">Securing your session...</p>
      </div>
    );
  }

  if (error || !sessionToken) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 text-white max-w-md w-full mx-auto overflow-hidden">
        <div className="h-1.5 bg-red-500/20" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <ShieldCheck className="w-5 h-5" />
            Authorization Failed
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {error || "We couldn't find a valid merchant session for this merchant."}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push('/dashboard')} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-none">
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full mx-auto"
    >
      <Card className="bg-[#0c0c12] border-zinc-800/80 text-white shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)] overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        
        <CardHeader className="pt-10 pb-6">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 1, 0], scale: [1, 1.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-500/10 rounded-full -z-10"
              />
            </div>

            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Authorized Successfully</h1>
              <p className="text-zinc-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                Your session for <span className="text-white font-semibold">{storeName || merchantId}</span> is ready to use in ChatGPT.
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8 space-y-8">
          {/* Token Box */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400/80">Token Copied</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Active Session</span>
              </div>
            </div>

            <div className="relative group flex items-center gap-3 bg-black/40 border border-zinc-800/80 p-3.5 rounded-xl">
              <div className="flex-1 font-mono text-[11px] text-zinc-400 truncate pr-2 opacity-60">
                {sessionToken}
              </div>
              <Button 
                onClick={copyToClipboard}
                className={`h-8 px-4 text-[10px] font-bold transition-all duration-300 ${
                  copied ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-violet-600 hover:bg-violet-500'
                } text-white border-none shadow-lg shadow-violet-500/10`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1.5" />
                    COPIED
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1.5" />
                    COPY
                  </>
                )}
              </Button>
            </div>

            <p className="mt-4 text-center text-[10px] text-zinc-500 flex items-center justify-center gap-2">
              <ShieldCheck className="w-3 h-3 opacity-50" />
              Auto-copied to clipboard. Simply paste it into ChatGPT.
            </p>
          </div>

          {/* How to use divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800/50"></span>
            </div>
            <span className="relative px-4 text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] bg-[#0c0c12]">How to use</span>
          </div>

          {/* Usage Instruction */}
          <div className="space-y-3">
            <p className="text-[11px] text-zinc-400 text-center">Return to ChatGPT and send:</p>
            <div 
              onClick={copyToClipboard}
              className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:border-violet-500/30 transition-colors"
            >
              <code className="text-[11px] font-mono text-zinc-300">
                "Use token: <span className="text-violet-400 font-bold">{sessionToken?.substring(0, 10)}...</span>"
              </code>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-400 group-hover:text-violet-300 transition-colors">
                <Copy className="w-3 h-3" />
                PASTE NOW
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="px-8 pt-0 pb-10">
          <Button 
            onClick={() => window.close()} 
            className="w-full bg-white text-black hover:bg-zinc-100 font-bold h-12 rounded-xl transition-all active:scale-[0.98]"
          >
            Done
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-12 flex flex-col items-center gap-2">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] flex items-center gap-3">
          <span>Convos Agentic Platform</span>
          <span className="w-1 h-1 rounded-full bg-zinc-800" />
          <span>Secure Session</span>
        </p>
        <p className="text-[9px] text-zinc-700">Return to ChatGPT to continue.</p>
      </div>
    </motion.div>
  );
}

export default function MCPSuccessPage() {
  return (
    <div className="min-h-screen bg-[#06060a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      
      <Suspense fallback={
        <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
      }>
        <MCPSuccessContent />
      </Suspense>
    </div>
  );
}
