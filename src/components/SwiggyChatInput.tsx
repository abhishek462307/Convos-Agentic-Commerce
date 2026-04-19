"use client"

import React from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { ArrowUp, Mic, MicOff, Loader2, Store, Sparkles, Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SwiggyChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  isListening: boolean;
  isTyping: boolean;
  onSubmit: (e?: React.FormEvent, overrideText?: string) => void;
  toggleListening: () => void;
  quickActions?: { label: string; icon?: any }[];
  onQuickAction?: (label: string) => void;
  showQuickActions?: boolean;
  onFocus?: () => void;
  hidden?: boolean;
  onVoiceChat?: () => void;
  isVoiceMode?: boolean;
  voiceState?: {
    isConnected: boolean;
    isConnecting: boolean;
    isMuted: boolean;
    isSpeakerOn: boolean;
    isListening: boolean;
    isSpeaking: boolean;
  };
    onVoiceAction?: (action: 'start' | 'end' | 'toggleMute' | 'toggleSpeaker') => void;
    position?: 'fixed' | 'absolute' | 'relative';
    isHero?: boolean;
    isCompact?: boolean;
  }

const thinkingPhrases = [
  "Thinking...",
  "Finding the best for you...",
  "Searching products...",
  "Almost there..."
];

export function SwiggyChatInput({ 
  inputText: initialInputText, 
  setInputText: parentSetInputText, 
  isListening, 
  isTyping, 
  onSubmit: parentOnSubmit, 
  toggleListening,
  quickActions = [],
  onQuickAction,
  showQuickActions = false,
  onFocus,
  hidden = false,
  onVoiceChat,
    isVoiceMode = false,
    voiceState,
    onVoiceAction,
    position = 'fixed',
    isHero = false,
    isCompact = false
  }: SwiggyChatInputProps) {
  const [inputText, setInputText] = React.useState(initialInputText);
  const [thinkingIndex, setThinkingIndex] = React.useState(0);
  const { scrollY } = useScroll();
  const [isVisible, setIsVisible] = React.useState(true);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const prevScrollY = React.useRef(0);
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);

  // Sync internal state with external if needed (e.g. for quick actions)
  React.useEffect(() => {
    setInputText(initialInputText);
  }, [initialInputText]);

  // Track keyboard height via Visual Viewport API (iOS Safari)
  React.useEffect(() => {
    if (isHero || isCompact || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [isHero, isCompact]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    parentSetInputText('');
    parentOnSubmit(e, text);
  };

  React.useEffect(() => {
    if (!isTyping) {
      setThinkingIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % thinkingPhrases.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isTyping]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const delta = latest - prevScrollY.current;
    prevScrollY.current = latest;
    if (isTyping || isListening || inputText.trim() || isVoiceMode || isHero || isCompact) {
      setIsVisible(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      return;
    }

    if (latest < 80) {
      setIsVisible(true);
      return;
    }

    if (delta > 8) {
      setIsVisible(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 400);
      return;
    }

    if (delta < -8) {
      setIsVisible(true);
    }
  });

  React.useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const containerClasses = isHero 
    ? "relative w-full z-10" 
    : isCompact 
      ? "relative w-full z-10" 
      : `${position} left-0 right-0 z-[51] pointer-events-none`;

  const innerClasses = isHero 
    ? "w-full pointer-events-auto" 
    : isCompact 
      ? "w-full pointer-events-auto" 
      : "max-w-lg mx-auto px-3 sm:px-4 pointer-events-auto";

    return (
      <motion.div 
        initial={isHero || isCompact ? { opacity: 0, y: 10 } : { y: 100, opacity: 0 }}
        animate={{ 
          y: (isVisible && !hidden) ? 0 : (isHero || isCompact ? 0 : 100), 
          opacity: (isVisible && !hidden) ? 1 : 0 
        }}
        transition={{ duration: 0.3 }}
        className={containerClasses}
          style={(!isHero && !isCompact) ? { bottom: `calc(24px + ${keyboardOffset}px)` } : undefined}
      >
      <div className={innerClasses}>
        <AnimatePresence mode="wait">
          {isTyping && !isVoiceMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center justify-center gap-2 mb-2.5"
            >
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[12px] sm:text-[13px] font-medium" style={{ color: 'var(--store-text-muted)' }}>
                {thinkingPhrases[thinkingIndex]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showQuickActions && quickActions.length > 0 && !isTyping && !isVoiceMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3"
            >
              <div className={isCompact ? "flex flex-wrap gap-2" : "flex gap-2 overflow-x-auto scrollbar-hide px-4 -mx-4 snap-x snap-mandatory md:justify-center"}>
                {quickActions.map((action, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onQuickAction?.(action.label)}
                    className={isCompact
                      ? "max-w-full border rounded-2xl px-4 py-2 text-[13px] font-semibold transition-all whitespace-normal text-left leading-tight hover:border-primary hover:text-primary active:scale-95 shadow-sm"
                      : "border rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-[13px] font-semibold transition-all whitespace-nowrap hover:border-primary hover:text-primary active:scale-95 shadow-md snap-center"}
                    style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)', color: 'var(--store-text-muted)' }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.form
              key="chat-input-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleSubmit} 
              className={`rounded-full border flex items-center gap-2 ${
                isHero ? 'p-3 shadow-[0_20px_60px_rgba(0,0,0,0.05)]' : isCompact ? 'p-1.5' : 'p-2 shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
              } ${isVoiceMode && voiceState?.isConnected ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}
                style={{ borderColor: 'var(--store-border)', background: isVoiceMode && voiceState?.isConnected ? undefined : 'var(--store-card-bg)' }}
            >
              {onVoiceAction && (
                <button 
                  type="button"
                  onClick={() => {
                    if (voiceState?.isConnected) {
                      onVoiceAction('end');
                    } else if (!voiceState?.isConnecting) {
                      onVoiceChat?.();
                      onVoiceAction('start');
                    }
                  }}
                  disabled={voiceState?.isConnecting}
                  className={`${isHero ? 'h-14 w-14' : isCompact ? 'h-9 w-9' : 'h-10 w-10'} rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg active:scale-95 shrink-0 ml-1`}
                  style={{
                    backgroundColor: voiceState?.isConnected 
                      ? '#ef4444' 
                      : voiceState?.isConnecting
                        ? '#9ca3af'
                        : 'var(--primary)',
                    color: 'white'
                  }}
                  title={voiceState?.isConnected ? "End Call" : "Start Voice Shopping"}
                >
                  {voiceState?.isConnecting ? (
                    <Loader2 className={`${isHero ? 'w-6 h-6' : isCompact ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />
                  ) : voiceState?.isConnected ? (
                    <PhoneOff className={isHero ? 'w-6 h-6' : isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                  ) : (
                    <Mic className={isHero ? 'w-6 h-6' : isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                  )}
                </button>
              )}
              
              <div className="relative flex-1 flex items-center gap-3 px-2">
                {isVoiceMode && voiceState?.isConnected && (
                  <div className="flex items-center gap-3 pr-3 border-r" style={{ borderColor: 'var(--store-border)' }}>
                    <div className="flex gap-[2px] items-center h-4">
                      {[...Array(4)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: voiceState?.isListening 
                              ? [3, 12, 3] 
                              : voiceState?.isSpeaking 
                                ? [3, 8, 3]
                                : 3
                          }}
                          transition={{
                            duration: 0.4,
                            repeat: Infinity,
                            delay: i * 0.1
                          }}
                          className="w-[2px] rounded-full"
                          style={{ 
                            backgroundColor: voiceState?.isListening 
                              ? '#22c55e' 
                              : voiceState?.isSpeaking 
                                ? 'var(--primary)' 
                                : '#d1d5db'
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onVoiceAction?.('toggleMute')}
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${voiceState?.isMuted ? 'bg-red-50 text-red-500' : ''}`}
                        style={!voiceState?.isMuted ? { color: 'var(--store-text-muted)', background: 'var(--store-card-bg)' } : undefined}
                      >
                        {voiceState?.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onVoiceAction?.('toggleSpeaker')}
                        className="h-7 w-7 rounded-full flex items-center justify-center transition-all"
                        style={{ color: !voiceState?.isSpeakerOn ? 'color-mix(in srgb, var(--store-text-muted) 55%, transparent)' : 'var(--store-text-muted)', background: 'var(--store-card-bg)' }}
                      >
                        {voiceState?.isSpeakerOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
                <Input 
                  value={inputText} 
                  onChange={(e) => { setInputText(e.target.value); parentSetInputText(e.target.value); }} 
                  onFocus={onFocus}
                  placeholder={
                    voiceState?.isConnected 
                      ? (voiceState.isListening ? "Listening..." : voiceState.isSpeaking ? "Assistant speaking..." : "I'm listening...")
                      : (isListening ? "Listening..." : isHero ? "What would you like to buy today?" : "Search or ask anything...")
                  } 
                  className={`w-full bg-transparent border-none ${isHero ? 'h-14 text-xl' : isCompact ? 'h-9 text-[13px]' : 'h-10 text-[14px] sm:text-[16px]'} px-0 font-medium focus-visible:ring-0 shadow-none placeholder:opacity-60`}
                  style={{ color: 'var(--store-text)' }}
                />
              </div>
              
              <div className="flex items-center gap-1 pr-1">
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className={`${isHero ? 'h-14 w-14' : isCompact ? 'h-8 w-8' : 'h-10 w-10'} rounded-full text-white flex items-center justify-center transition-all disabled:cursor-not-allowed active:scale-95`}
                    style={{ 
                      background: 'var(--primary)', 
                      opacity: !inputText.trim() ? 0.3 : 1 
                    }}
                >
                  {isTyping ? (
                    <Loader2 className={`${isHero ? 'w-6 h-6' : 'w-5 h-5'} animate-spin`} />
                  ) : (
                    <ArrowUp className={`${isHero ? 'w-6 h-6' : 'w-5 h-5'}`} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </motion.form>
          </AnimatePresence>

      </div>
    </motion.div>
  );
}
