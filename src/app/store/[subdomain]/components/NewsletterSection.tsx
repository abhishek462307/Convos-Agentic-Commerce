"use client"

import React, { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SectionSchema } from '@/types/storefront/sections';

export function NewsletterSection({ section, subdomain }: { section: SectionSchema; subdomain: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subdomain }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setEmail('');
        toast.success(data.message || 'Subscribed successfully!');
      } else {
        toast.error(data.error || 'Failed to subscribe');
      }
    } catch {
      toast.error('Failed to subscribe');
    }
    setLoading(false);
  };

  return (
    <div className="py-12 px-4" style={{ background: 'var(--store-bg)' }}>
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
          {section.title || 'Stay in the loop'}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--store-text-muted)' }}>
          {typeof section.content === 'object' && section.content && 'text' in section.content
            ? String((section.content as any).text || '')
            : 'Subscribe to get updates on new products and exclusive offers.'}
        </p>

        {success ? (
          <div className="flex items-center justify-center gap-2 text-green-600 py-4">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">You're subscribed!</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 h-11"
              style={{
                background: 'var(--store-card-bg)',
                borderColor: 'var(--store-border)',
                color: 'var(--store-text)',
              }}
              required
            />
            <Button type="submit" disabled={loading} className="h-11 px-6 font-bold" style={{ background: 'var(--primary)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
