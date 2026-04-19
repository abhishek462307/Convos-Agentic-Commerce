"use client"

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getStorefrontPath } from '@/lib/storefront/navigation';
import { ShoppingBag, Store, Sparkles, Shield, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { SwiggyChatInput } from '@/components/SwiggyChatInput';

export function LandingHero({ 
  merchant, 
  loaderConfig, 
  inputText, 
  setInputText, 
  isListening, 
  isTyping, 
  onSubmit, 
  toggleListening, 
  quickActions, 
  onQuickAction,
  cartCount,
  onOpenCart,
  onOpenLogin,
  currentUser,
  subdomain,
  desktopMode,
  onToggleMode
}: any) {
  const aiName = merchant.ai_character_name || merchant.store_name;
  const aiAvatar = merchant.ai_character_avatar_url;
  const branding = merchant.branding_settings || {};
  const aiSubtitle = branding.ai_character_subtitle;
  const heroTitle = branding.hero_title || "What can I help you find today?";
  const heroSubtitle = branding.hero_subtitle || "Ask me anything about our products, get personalized recommendations, or let me help you find the perfect item.";

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'var(--store-bg)' }}>
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.15]"
          style={{ 
            background: `radial-gradient(circle, var(--primary) 0%, transparent 70%)`,
            filter: 'blur(80px)'
          }}
        />
        <div 
          className="absolute bottom-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full opacity-[0.08]"
          style={{ 
            background: `radial-gradient(circle, var(--primary) 0%, transparent 70%)`,
            filter: 'blur(100px)'
          }}
        />
      </div>

      <header className="absolute top-0 inset-x-0 z-[30]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loaderConfig.logoUrlDesktop || loaderConfig.logoUrl ? (
              <div 
                className="relative overflow-hidden"
                style={{
                  width: `${(loaderConfig.logoUrlDesktop ? loaderConfig.logoWidthDesktop : loaderConfig.logoWidthMobile || 80) * 0.45}px`,
                  height: `${(loaderConfig.logoUrlDesktop ? loaderConfig.logoHeightDesktop : loaderConfig.logoHeightMobile || 80) * 0.45}px`
                }}
              >
                <Image 
                  src={loaderConfig.logoUrlDesktop || loaderConfig.logoUrl!} 
                  alt={merchant.store_name} 
                  fill 
                  sizes="120px"
                  className="object-contain" 
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          
            <div className="flex items-center gap-2">
              <div className="flex items-center h-9 rounded-full border border-zinc-200/60 bg-white/80 backdrop-blur-sm p-0.5 mr-1">
                <button
                  onClick={() => onToggleMode?.('ai')}
                  className="h-full px-3 rounded-full flex items-center gap-1.5 text-[12px] font-medium transition-all"
                  style={{
                    background: desktopMode === 'ai' ? 'var(--primary)' : 'transparent',
                    color: desktopMode === 'ai' ? 'white' : '#71717a',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Store
                </button>
                <button
                  onClick={() => onToggleMode?.('browse')}
                  className="h-full px-3 rounded-full flex items-center gap-1.5 text-[12px] font-medium transition-all"
                  style={{
                    background: desktopMode === 'browse' ? 'var(--primary)' : 'transparent',
                    color: desktopMode === 'browse' ? 'white' : '#71717a',
                  }}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Browse
                </button>
              </div>
              {currentUser ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="h-9 px-3 rounded-xl text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80"
                >
                  <Link href={getStorefrontPath(subdomain, '/account', typeof window !== 'undefined' ? window.location.host : undefined)} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[11px] font-semibold text-zinc-700">
                      {currentUser.email?.charAt(0).toUpperCase()}
                    </div>
                    Account
                  </Link>
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onOpenLogin}
                  className="h-9 px-4 rounded-xl text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80"
                >
                  Sign in
                </Button>
              )}
              <Button 
                onClick={onOpenCart}
                variant="outline"
                className="h-9 px-4 rounded-xl text-[13px] font-medium border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </div>
        </div>
      </header>

      <div className="w-full max-w-2xl mx-auto px-6 relative z-10 flex flex-col items-center -mt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2.5 px-2 pr-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6"
            >
              <div className="relative">
                {aiAvatar ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-black/[0.04]">
                    <Image src={aiAvatar} alt={aiName} fill sizes="24px" className="object-cover" />
                  </div>
                ) : loaderConfig.logoUrl ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-black/[0.04]">
                    <Image src={loaderConfig.logoUrl} alt={merchant.store_name} fill sizes="24px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                    <Store className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
              </div>
              <span className="text-[11px] font-medium text-zinc-600">{aiSubtitle || `Talk to ${aiName}`}</span>
            </motion.div>
          
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-[52px] font-semibold mb-5 tracking-[-0.02em] leading-[1.1] text-zinc-900 whitespace-pre-wrap" 
            >
              {heroTitle === "What can I help you find today?" ? (
                <>
                  What can I help you<br />
                  <span style={{ color: 'var(--primary)' }}>find today?</span>
                </>
              ) : heroTitle}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-zinc-500 text-[15px] md:text-base font-normal leading-relaxed max-w-md mx-auto whitespace-pre-wrap"
            >
              {heroSubtitle}
            </motion.p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl"
        >
          <div className="relative">
            <div 
              className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `linear-gradient(135deg, var(--primary)20, transparent)` }}
            />
            <SwiggyChatInput
              inputText={inputText}
              setInputText={setInputText}
              isListening={isListening}
              isTyping={isTyping}
              onSubmit={onSubmit}
              toggleListening={toggleListening}
              quickActions={quickActions}
              onQuickAction={onQuickAction}
              showQuickActions={false}
              onFocus={() => {}}
              hidden={false}
              isHero={true}
            />
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-[12px] text-zinc-400 font-medium mr-1">Try:</span>
            {quickActions.map((action: any, idx: number) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + idx * 0.05 }}
                onClick={() => onQuickAction(action.label)}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-zinc-200/60 text-[12px] font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-white transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <action.icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                {action.label}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[11px] text-zinc-400"
      >
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>Secure checkout</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-zinc-300" />
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-powered</span>
        </div>
      </motion.div>
    </div>
  );
}
