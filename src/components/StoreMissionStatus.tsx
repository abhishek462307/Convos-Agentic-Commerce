"use client"

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Loader2, ListTodo, Check, User, Shield, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function MissionStatus({ intents, plans, merchant }: { intents: any[], plans: any[], merchant: any }) {
  if (!intents || intents.length === 0) return null;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-3 mb-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Your AI is working for you</h4>
        </div>
      <div className="grid grid-cols-1 gap-3">
        {intents.map((intent) => {
          const plan = plans.find(p => p.intent_id === intent.id);
          const isAwaitingApproval = plan && !plan.is_approved;
          
          return (
            <motion.div
              key={intent.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-[32px] border shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col gap-2.5 ${isAwaitingApproval ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-zinc-100'}`}
            >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0 ${isAwaitingApproval ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-zinc-50 border-zinc-100 text-zinc-500'}`}>
                    {intent.intent_type.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1 h-1 rounded-full ${intent.status === 'completed' ? 'bg-green-500' : isAwaitingApproval ? 'bg-amber-500 animate-pulse' : 'bg-primary animate-pulse'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-tight ${isAwaitingApproval ? 'text-amber-600' : intent.status === 'completed' ? 'text-green-600' : 'text-primary'}`}>
                      {intent.status === 'completed' ? 'Mission Success' : isAwaitingApproval ? 'Approval Required' : 'Executing Strategy'}
                    </span>
                  </div>
                </div>
                <p className="text-[13px] font-bold leading-snug text-zinc-900">{intent.goal}</p>
                
                {plan && plan.steps && plan.steps.length > 0 ? (
                  <div className="mt-1.5 space-y-2 border-t pt-3 border-zinc-50">
                    <div className="flex items-center gap-2 mb-0.5">
                      <ListTodo className={`w-3 h-3 ${isAwaitingApproval ? 'text-amber-500' : 'text-primary'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isAwaitingApproval ? 'text-amber-500/70' : 'text-zinc-400'}`}>
                        {isAwaitingApproval ? 'Proposed Plan' : 'Execution Progress'}
                      </span>
                    </div>
                    {plan.steps.map((step: string, idx: number) => {
                      const isCompleted = idx < (plan.current_step || 0) || plan.status === 'completed';
                      const isCurrent = idx === (plan.current_step || 0) && plan.status !== 'completed' && !isAwaitingApproval;
                      
                      return (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isCompleted ? 'border-green-500 bg-green-50' : isCurrent ? 'border-primary bg-primary/10' : 'border-zinc-100'}`}>
                            {isCompleted ? <Check className="w-2 h-2 text-green-600" /> : isCurrent ? <div className="w-1 h-1 rounded-full bg-primary" /> : null}
                          </div>
                          <span className={`text-[11px] leading-relaxed ${isCurrent ? 'font-bold text-zinc-900' : isCompleted ? 'text-zinc-400' : 'text-zinc-400'}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center gap-2.5 border-t pt-3 border-zinc-50">
                    <Loader2 className="w-3 h-3 animate-spin text-primary/40" />
                    <span className="text-[10px] font-medium text-zinc-400">Drafting strategy...</span>
                  </div>
                )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function BargainTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}m ${secs}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (timeLeft === 'Expired') return <span className="text-[10px] text-red-500 font-bold ml-1">DEAL EXPIRED</span>;
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 w-fit">
      <Clock className="w-3 h-3" />
      DEAL EXPIRES IN {timeLeft}
    </div>
  );
}

export function IdentityCard({ subdomain, onIdentify }: { subdomain: string; onIdentify: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!email.includes('@')) {
      toast.error('Invalid email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_identity_otp', subdomain, email })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send code');
      } else {
        toast.success('Verification code sent');
        setStep('otp');
      }
    } catch (e) {
      toast.error('Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length < 4) {
      toast.error('Enter the code from your email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', subdomain, email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
      } else {
        onIdentify(email);
        toast.success('Identity verified');
      }
    } catch (e) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 rounded-[40px] bg-white border border-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] mt-6 w-full max-w-[95%] relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-[20px] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-6 transition-transform" style={{ background: 'var(--primary)' }}>
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="rounded-md px-2 py-0.5 inline-flex items-center gap-1.5 mb-1" style={{ backgroundColor: 'var(--highlight-color)' }}>
              <Shield className="w-3 h-3" style={{ color: 'var(--primary)' }} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--primary)' }}>Identity Protocol</span>
            </div>
            <h4 className="text-xl font-black tracking-tighter" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>Secure Verification</h4>
          </div>
        </div>
        
        <p className="text-[13px] mb-8 font-bold leading-relaxed max-w-sm" style={{ color: 'var(--store-text-muted)' }}>To synchronize your negotiation progress and secure your items, please authenticate your session with your email address.</p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {step === 'email' ? (
            <>
              <div className="relative flex-1 group/input">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within/input:text-primary transition-colors" />
                <Input 
                  type="email" 
                  placeholder="identity@vault.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 pl-12 text-base bg-zinc-50 border-zinc-100 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 text-zinc-900 font-bold rounded-xl transition-all placeholder:text-zinc-300 border-none shadow-inner"
                />
              </div>
              <Button 
                onClick={sendOtp}
                disabled={loading}
                className="h-14 px-8 font-black shadow-lg rounded-xl tracking-[0.2em] bg-zinc-900 text-white hover:bg-black transition-all active:scale-95"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SEND CODE'}
              </Button>
            </>
          ) : (
            <>
              <div className="relative flex-1 group/input">
                <Input 
                  type="text" 
                  placeholder="Enter code" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)}
                  className="h-14 text-base bg-zinc-50 border-zinc-100 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 text-zinc-900 font-bold rounded-xl transition-all placeholder:text-zinc-300 border-none shadow-inner"
                />
              </div>
              <Button 
                onClick={verifyOtp}
                disabled={loading}
                className="h-14 px-8 font-black shadow-lg rounded-xl tracking-[0.2em] bg-zinc-900 text-white hover:bg-black transition-all active:scale-95"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'VERIFY'}
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
