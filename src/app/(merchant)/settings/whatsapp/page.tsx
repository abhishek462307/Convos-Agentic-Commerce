"use client"

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Info,
  RefreshCw,
  LogOut,
  Phone,
  ShoppingCart,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import QRCode from 'qrcode';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { motion, AnimatePresence } from 'framer-motion';

export default function WhatsAppSettingsPage() {
  const { loading: merchantLoading } = useMerchant();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/whatsapp/status', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        if (data.config.qr_code) {
          const url = await QRCode.toDataURL(data.config.qr_code);
          setQrImageUrl(url);
        } else {
          setQrImageUrl(null);
        }
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll for status changes when connecting or waiting for QR
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Initializing WhatsApp connection...');
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to connect');
      }
    } catch {
      toast.error('Failed to connect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp? This will stop all notifications and AI support.')) return;
    
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('WhatsApp disconnected');
        setConfig(null);
        setQrImageUrl(null);
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch {
      toast.error('Failed to disconnect WhatsApp');
    } finally {
      setDisconnecting(false);
    }
  };

  if (merchantLoading || (loading && !config)) {
    return <MerchantPageSkeleton />;
  }

  const isConnected = config?.status === 'connected';
  const isConnecting = config?.status === 'connecting' || config?.status === 'qr_ready';

    return (
      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Channels</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">WhatsApp Connection</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">WhatsApp Integration</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">Connect your WhatsApp to handle support and notifications automatically from a calm control surface.</p>
          </div>
          <div className="flex gap-3">
            {isConnected && (
              <Button 
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="h-11 px-6 border-red-500/20 text-red-500 hover:bg-red-500/5 text-[11px] font-bold uppercase tracking-[0.12em] rounded-[16px] transition-all shadow-sm"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                Disconnect Service
              </Button>
            )}
            {!isConnected && !isConnecting && (
              <Button 
                onClick={handleConnect}
                disabled={connecting}
                className="h-11 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-md px-8 rounded-[16px] text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                Connect WhatsApp
              </Button>
            )}
          </div>
        </motion.div>
  
        <div className="grid grid-cols-1 gap-6">
          {/* Connection Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm transition-all duration-500`}>
              <CardHeader className="border-b border-border/70 py-4 px-6 bg-secondary/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border border-border/70 bg-background shadow-sm`}>
                      <MessageSquare className={`w-4 h-4 ${isConnected ? "text-emerald-500" : "text-muted-foreground/60"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-[17px] font-semibold tracking-tight">System Status</CardTitle>
                      <CardDescription className="text-[13px] text-muted-foreground mt-0.5">
                        {isConnected ? 'Your WhatsApp is active and listening' : 'Not connected to any WhatsApp account'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] border-none transition-all duration-500 ${
                      isConnected ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary/40 text-muted-foreground/60"
                    }`}
                  >
                    {isConnected ? (
                      <div className="flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Connected
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> Offline
                      </div>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {isConnected ? (
                    <motion.div 
                      key="connected"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between p-5 bg-secondary/20 rounded-[20px] border border-border/70 group hover:border-border transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center border border-border/70 group-hover:border-emerald-500/30 transition-all shadow-sm">
                            <Phone className="w-6 h-6 text-[#25D366]" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em] mb-0.5">Linked Number</p>
                            <p className="text-xl font-bold text-foreground tracking-tight">+{config?.phone_number}</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-black uppercase px-3 py-1 rounded-full">Active</Badge>
                      </div>
  
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[20px] p-5 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="w-9 h-9 rounded-xl bg-background border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-foreground tracking-tight">Connection Healthy</p>
                            <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 font-medium">
                              Your AI agent is now responding to messages and order notifications are being sent via WhatsApp. Transcripts are being logged to your Intelligence dashboard.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : isConnecting ? (
                    <motion.div 
                      key="connecting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-8"
                    >
                      {qrImageUrl ? (
                        <div className="space-y-6 text-center max-w-lg mx-auto">
                          <div className="relative group inline-block">
                            <div className="absolute -inset-2 bg-[#25D366]/10 rounded-[2.5rem] blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-white p-5 rounded-[2rem] border-2 border-[#25D366]/20 shadow-xl inline-block transition-transform hover:scale-[1.02]">
                              <img src={qrImageUrl} alt="WhatsApp QR Code" className="w-48 h-48" width={192} height={192} />
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <h3 className="text-[17px] font-bold tracking-tight text-foreground uppercase tracking-[0.12em]">Scan to Authenticate</h3>
                            <div className="grid grid-cols-1 gap-2 text-left">
                              {[
                                "Open WhatsApp on your device",
                                "Tap Settings > Linked Devices",
                                "Tap Link a Device",
                                "Scan this code with your camera"
                              ].map((step, i) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  key={i} 
                                  className="flex items-center gap-4 text-[13.5px] font-semibold text-muted-foreground/80 bg-secondary/20 p-3.5 rounded-[16px] border border-border/70 group hover:border-emerald-500/30 transition-all shadow-sm"
                                >
                                  <span className="w-7 h-7 rounded-full bg-background border border-border/70 flex items-center justify-center text-[11px] font-bold text-foreground shrink-0 group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors shadow-sm">{i + 1}</span>
                                  {step}
                                </motion.div>
                              ))}
                            </div>
                          </div>
  
                          <Button 
                            variant="ghost" 
                            onClick={handleConnect}
                            className="text-muted-foreground hover:text-foreground text-[11px] font-bold uppercase tracking-[0.12em] h-10 px-6 rounded-[12px] transition-all"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerate Stream
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-[#25D366]/10 blur-3xl rounded-full"></div>
                            <Loader2 className="w-10 h-10 animate-spin text-[#25D366] relative z-10" />
                          </div>
                          <h3 className="text-[17px] font-bold tracking-tight text-foreground uppercase tracking-[0.12em]">Initializing Handshake</h3>
                          <p className="text-[13px] text-muted-foreground font-medium mt-2 max-w-xs mx-auto leading-relaxed">Establishing a secure socket connection with WhatsApp infrastructure...</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="disconnected"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12"
                    >
                      <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border/70 shadow-inner">
                        <QrCode className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <h3 className="text-[17px] font-bold tracking-tight text-foreground uppercase tracking-[0.12em]">Connect your Business Account</h3>
                      <p className="text-[13px] text-muted-foreground font-medium max-w-md mx-auto mt-2 mb-8 leading-relaxed">
                        Enable agentic support and automated order notifications on WhatsApp. 
                        Your customers will be able to track orders and bargain directly with your AI.
                      </p>
                      <Button 
                        onClick={handleConnect}
                        disabled={connecting}
                        className="bg-foreground text-background hover:bg-foreground/90 shadow-md px-10 h-11 rounded-[16px] text-[11px] font-bold uppercase tracking-[0.12em] transition-all active:scale-95"
                      >
                        {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Authorize Account
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
  
          {/* Features Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border/70 bg-card rounded-[24px] shadow-sm hover:border-border transition-all p-6 flex flex-col gap-5 group h-full">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-[16px] font-bold text-foreground tracking-tight">AI Support Agent</h4>
                  <p className="text-[13px] text-muted-foreground font-medium mt-1.5 leading-relaxed">
                    Once connected, our AI agent will automatically resolve customer queries on WhatsApp using your specific store knowledge and policies.
                  </p>
                </div>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/70 bg-card rounded-[24px] shadow-sm hover:border-border transition-all p-6 flex flex-col gap-5 group h-full">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-[16px] font-bold text-foreground tracking-tight">Transaction Updates</h4>
                  <p className="text-[13px] text-muted-foreground font-medium mt-1.5 leading-relaxed">
                    Send automated order confirmations, fulfillment status, and real-time tracking links directly to your customers' preferred messaging app.
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
  
          {/* Commerce Settings Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link href="/whatsapp-commerce" className="group block">
              <Card className="border-border/70 bg-card rounded-[24px] shadow-sm hover:border-border transition-all overflow-hidden">
                <CardContent className="p-6 flex items-center gap-6">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/20 shrink-0 group-hover:rotate-6 transition-transform shadow-sm">
                    <ShoppingCart className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[16px] font-bold text-foreground uppercase tracking-[0.12em] text-[13px]">Commerce Settings</h4>
                    <p className="text-[13px] text-muted-foreground font-medium mt-1 leading-relaxed">
                      Control cart, checkout, bargaining, message templates, live sessions, and AI behavior on WhatsApp.
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-secondary/30 flex items-center justify-center group-hover:bg-secondary/50 group-hover:translate-x-1 transition-all shadow-sm">
                    <ChevronRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
  
          {/* FAQ/Warnings */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-amber-500/5 border border-amber-500/10 rounded-[24px] p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-background border border-amber-500/20 flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] font-black text-amber-500 uppercase tracking-[0.14em] mb-4">System Considerations</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  {[
                    "Use a dedicated number to avoid mixing personal and business data.",
                    "WhatsApp enforces messaging limits; our AI uses natural delays to prevent flagging.",
                    "Your system maintains a persistent socket for real-time responsiveness.",
                    "Messages are end-to-end encrypted before being processed by your AI."
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13px] text-muted-foreground font-medium leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0 shadow-sm" /> 
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
}
