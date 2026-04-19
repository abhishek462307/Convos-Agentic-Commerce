"use client"

import React, { useState } from 'react';
import { Loader2, Eye, EyeOff, ArrowRight, Clock, Heart, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AuthPageProps {
  isOpen?: boolean; // kept temporarily so existing imports don't break
  onClose?: () => void;
  subdomain: string;
  merchantName: string;
  logoUrl?: string | null;
  onLoginSuccess: (user: any) => void;
}

type Mode = 'login' | 'signup' | 'forgot';

const PERKS = [
  { icon: Clock, label: 'Order history & real-time tracking' },
  { icon: Heart, label: 'Saved items & personalized picks' },
  { icon: Lock, label: 'Secure checkout & saved addresses' },
];

export function LoginModal({
  isOpen = true,
  onClose,
  subdomain,
  merchantName,
  logoUrl,
  onLoginSuccess,
}: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await fetch('/api/store/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            subdomain,
            email: formData.email,
            password: formData.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Login failed');
        } else {
          localStorage.setItem(`store_auth_${subdomain}`, JSON.stringify(data.session));
          toast.success('Logged in successfully!');
          onLoginSuccess(data.session.user);
          if (onClose) onClose();
        }
      } else if (mode === 'signup') {
        const res = await fetch('/api/store/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'signup',
            subdomain,
            email: formData.email,
            password: formData.password,
            name: `${formData.firstName} ${formData.lastName}`.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Signup failed');
        } else {
          toast.success(data.message || 'Account created!');
          setMode('login');
          setFormData((prev) => ({ ...prev, password: '' }));
        }
      } else {
        const res = await fetch('/api/store/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'forgot_password',
            subdomain,
            email: formData.email,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to send reset email');
        } else {
          toast.success(data.message || 'Password reset email sent');
          setMode('login');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full min-h-[100dvh]" style={{ background: 'var(--store-bg)' }}>
      {/* Close/Back button */}
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-5 right-5 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'color-mix(in srgb, var(--store-card-bg) 88%, white)',
            border: '0.5px solid color-mix(in srgb, var(--store-border) 85%, white)',
            color: 'var(--store-text-muted)',
          }}
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-[100dvh]">
        {/* ── Left Panel ── */}
        <div
          className="relative hidden lg:flex flex-col justify-between p-12 xl:p-20 overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--store-card-bg) 95%, white)',
            borderRight: '0.5px solid color-mix(in srgb, var(--store-border) 85%, white)',
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 24%, transparent) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 14%, transparent) 0%, transparent 70%)' }}
          />
          {/* Grid lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--store-text)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={merchantName}
                  className="w-10 h-10 rounded-xl object-cover"
                  style={{ border: '0.5px solid color-mix(in srgb, var(--store-border) 85%, white)' }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-semibold"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 14%, white)',
                    color: 'var(--primary)',
                    border: '0.5px solid color-mix(in srgb, var(--primary) 26%, white)',
                  }}
                >
                  {merchantName.substring(0, 1).toUpperCase()}
                </div>
              )}
              <p className="text-[13px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--store-text-muted)' }}>
                {merchantName}
              </p>
            </div>

            {/* Headline */}
            <h2
              className="text-[48px] xl:text-[56px] font-semibold leading-[1.08] tracking-tight mb-5"
              style={{ color: 'var(--store-text)' }}
            >
              Your<br />
              <span style={{ color: 'var(--primary)' }}>account</span><br />
              awaits.
            </h2>
            <p className="text-[15px] leading-[1.6] max-w-sm"
              style={{ color: 'var(--store-text-muted)' }}>
              Sign in to continue your personalized shopping journey. Track orders, save favorites, and breeze through checkout.
            </p>
          </div>

          {/* Perks */}
          <div className="relative z-10 flex flex-col gap-4">
            {PERKS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 10%, white)',
                    border: '0.5px solid color-mix(in srgb, var(--primary) 22%, white)',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <span className="text-[13.5px] font-medium" style={{ color: 'var(--store-text-muted)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-col justify-center items-center p-8 md:p-12 lg:p-20 relative overflow-y-auto min-h-[100dvh]">
          <div className="w-full max-w-[420px]">
            {/* Tabs */}
            <div
              className="flex rounded-[12px] p-1.5 mb-10 shadow-sm"
              style={{
                background: 'color-mix(in srgb, var(--store-card-bg) 92%, white)',
                border: '0.5px solid color-mix(in srgb, var(--store-border) 85%, white)',
              }}
            >
              {(['login', 'signup'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  className="flex-1 py-3 rounded-lg text-[13.5px] font-semibold tracking-wide transition-all"
                  style={
                    mode === tab
                      ? {
                          background: 'color-mix(in srgb, var(--primary) 12%, white)',
                          border: '0.5px solid color-mix(in srgb, var(--primary) 26%, white)',
                          color: 'var(--primary)',
                        }
                      : { color: 'var(--store-text-muted)', border: '0.5px solid transparent' }
                  }
                >
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-5"
              >
                {mode === 'signup' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name">
                      <TextInput
                        placeholder="Jane"
                        value={formData.firstName}
                        onChange={(v) => update('firstName', v)}
                        required
                      />
                    </Field>
                    <Field label="Last Name">
                      <TextInput
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(v) => update('lastName', v)}
                        required
                      />
                    </Field>
                  </div>
                )}

                <Field label="Email Address">
                  <TextInput
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(v) => update('email', v)}
                    required
                  />
                </Field>

                {mode !== 'forgot' ? (
                  <Field
                    label="Password"
                    right={
                      mode === 'login' ? (
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-[12px] font-semibold tracking-wide transition-opacity hover:opacity-100 opacity-60"
                          style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Forgot?
                        </button>
                      ) : null
                    }
                  >
                    <div className="relative">
                      <TextInput
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(v) => update('password', v)}
                        required
                        paddingRight
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 transition-colors"
                        style={{ color: 'var(--store-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {showPassword
                          ? <EyeOff className="w-4 h-4 hover:opacity-80 transition-opacity" />
                          : <Eye className="w-4 h-4 hover:opacity-80 transition-opacity" />}
                      </button>
                    </div>
                  </Field>
                ) : (
                  <div
                    className="rounded-xl px-4 py-3 text-[13px] leading-relaxed"
                    style={{
                      background: 'color-mix(in srgb, var(--primary) 7%, white)',
                      border: '0.5px solid color-mix(in srgb, var(--primary) 18%, white)',
                      color: 'var(--store-text-muted)',
                    }}
                  >
                    Enter your account email and we’ll send you a password reset link.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[56px] rounded-xl font-bold text-[14.5px] tracking-wide flex items-center justify-center gap-2 mt-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md"
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                <p className="text-center text-[13.5px] mt-2 font-medium" style={{ color: 'var(--store-text-muted)' }}>
                  {mode === 'login' ? 'New here? ' : mode === 'signup' ? 'Already have an account? ' : 'Remembered your password? '}
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="hover:underline underline-offset-4 decoration-2"
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {mode === 'login' ? 'Create an account' : 'Sign in'}
                  </button>
                </p>
              </motion.form>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────

function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2.5">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ color: 'var(--store-text-muted)' }}
        >
          {label}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  paddingRight,
}: {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  paddingRight?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full h-[56px] rounded-xl text-[14.5px] font-medium outline-none transition-all"
      style={{
        background: 'color-mix(in srgb, var(--store-card-bg) 96%, white)',
        border: '0.5px solid color-mix(in srgb, var(--store-border) 88%, white)',
        color: 'var(--store-text)',
        padding: paddingRight ? '0 48px 0 18px' : '0 18px',
        fontFamily: 'inherit',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary) 40%, white)';
        e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 6%, white)';
        e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--store-border) 88%, white)';
        e.currentTarget.style.background = 'color-mix(in srgb, var(--store-card-bg) 96%, white)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}
