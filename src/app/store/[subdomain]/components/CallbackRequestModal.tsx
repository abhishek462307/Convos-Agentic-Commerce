"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, User, Clock, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  storeName: string;
};

const TIME_SLOTS = [
  'Morning (9am – 12pm)',
  'Afternoon (12pm – 4pm)',
  'Evening (4pm – 8pm)',
  'Anytime',
];

export function CallbackRequestModal({ isOpen, onClose, subdomain, storeName }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Please enter your name and phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/store/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, name, phone, email, message, preferredTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
      setPreferredTime('');
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden"
            style={{ background: 'var(--store-card-bg)', border: '1px solid var(--store-border)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--store-border)' }}>
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--store-text)' }}>Request a Callback</h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--store-text-muted)' }}>
                  {storeName} will call you back
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: 'var(--store-border)' }}
              >
                <X className="w-3.5 h-3.5" style={{ color: 'var(--store-text-muted)' }} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-5 py-10 flex flex-col items-center text-center"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                    style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
                  >
                    <CheckCircle className="w-7 h-7" style={{ color: 'var(--primary)' }} />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--store-text)' }}>
                    Request Received!
                  </h3>
                  <p className="text-[13px] max-w-xs" style={{ color: 'var(--store-text-muted)' }}>
                    The team at {storeName} will reach you at <span className="font-semibold" style={{ color: 'var(--store-text)' }}>{phone}</span>
                    {preferredTime ? ` during ${preferredTime.toLowerCase()}` : ' shortly'}.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-6 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: 'var(--primary)' }}
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="px-5 py-5 space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--store-text-muted)' }}>
                        Your Name *
                      </label>
                      <div className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all focus-within:border-primary/40" style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}>
                        <User className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--store-text-muted)' }} />
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Enter your name"
                          required
                          className="flex-1 bg-transparent outline-none text-[13px]"
                          style={{ color: 'var(--store-text)' }}
                        />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--store-text-muted)' }}>
                        Phone Number *
                      </label>
                      <div className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all focus-within:border-primary/40" style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}>
                        <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--store-text-muted)' }} />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          required
                          className="flex-1 bg-transparent outline-none text-[13px]"
                          style={{ color: 'var(--store-text)' }}
                        />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--store-text-muted)' }}>
                        Preferred Time
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TIME_SLOTS.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setPreferredTime(prev => prev === slot ? '' : slot)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all"
                            style={{
                              background: preferredTime === slot ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--store-bg)',
                              borderColor: preferredTime === slot ? 'var(--primary)' : 'var(--store-border)',
                              color: preferredTime === slot ? 'var(--primary)' : 'var(--store-text-muted)',
                            }}
                          >
                            <Clock className="w-3 h-3" />
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--store-text-muted)' }}>
                        Message (optional)
                      </label>
                      <div className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-all focus-within:border-primary/40" style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}>
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--store-text-muted)' }} />
                        <textarea
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder="What's this about? e.g. Order #1234, product inquiry..."
                          rows={2}
                          className="flex-1 bg-transparent outline-none text-[13px] resize-none"
                          style={{ color: 'var(--store-text)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: 'var(--primary)' }}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Phone className="w-4 h-4" /> Request Callback</>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
