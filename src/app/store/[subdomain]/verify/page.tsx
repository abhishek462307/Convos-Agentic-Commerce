"use client"

import { useState, useEffect, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTemplateById } from '@/lib/store-templates';
import { AuthSkeleton } from '@/components/StoreSkeletons';
import { getStorefrontPath } from '@/lib/storefront/navigation';
import { motion } from 'framer-motion';

function StoreVerifyContent({ subdomain }: { subdomain: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMerchant() {
      const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
      
      if (data) {
        setMerchant(data);
        const branding = data.branding_settings || {};
        const templateId = branding.template_id || 'minimal-light';
        const template = getTemplateById(templateId);
        const primaryColor = branding.primary_color || '#008060';
        
        document.documentElement.style.setProperty('--primary', primaryColor);
        if (template) {
          document.documentElement.style.setProperty('--store-bg', template.colors.background);
          document.documentElement.style.setProperty('--store-card-bg', template.colors.card_background);
          document.documentElement.style.setProperty('--store-text', template.colors.text_primary);
          document.documentElement.style.setProperty('--store-text-muted', template.colors.text_secondary);
          document.documentElement.style.setProperty('--store-border', template.colors.border);
        }
      }
      setLoading(false);
    }
    fetchMerchant();
  }, [subdomain]);

  useEffect(() => {
    if (!loading && token) {
      verifyEmail();
    } else if (!loading && !token) {
      setVerifying(false);
      setError('Invalid verification link');
    }
  }, [loading, token]);

  const verifyEmail = async () => {
    try {
      const response = await fetch('/api/store/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', subdomain, token })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    }
    setVerifying(false);
  };

  if (loading || verifying) {
    return <AuthSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--store-bg, #F1F1F6)' }}>
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-4" style={{ background: 'var(--store-card-bg, white)' }}>
        <Link href={getStorefrontPath(subdomain, '/', typeof window !== 'undefined' ? window.location.host : undefined)}>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--store-bg)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--store-text)' }} />
          </motion.button>
        </Link>
        <div>
          <h1 className="text-[17px] font-bold leading-none" style={{ color: 'var(--store-text)' }}>
            {success ? 'Email Verified' : 'Verification Failed'}
          </h1>
          <p className="text-[12px] mt-1 font-medium" style={{ color: 'var(--store-text-muted)' }}>{merchant?.store_name}</p>
        </div>
      </div>

      <div className="flex-1 p-4 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-8 shadow-sm text-center max-w-md w-full"
          style={{ background: 'var(--store-card-bg, white)' }}
        >
          {success ? (
            <>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(16, 185, 129, 0.1)' }}
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </motion.div>
              
              <h2 className="text-[20px] font-black mb-2" style={{ color: 'var(--store-text)' }}>
                Email Verified!
              </h2>
              <p className="text-[14px] mb-8" style={{ color: 'var(--store-text-muted)' }}>
                Your email has been successfully verified. You can now log in to your account.
              </p>

              <Link href={getStorefrontPath(subdomain, '/login', typeof window !== 'undefined' ? window.location.host : undefined)}>
                <Button
                  className="w-full h-14 text-[15px] font-black rounded-xl text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                  style={{ 
                    backgroundColor: 'var(--primary)', 
                    boxShadow: '0 10px 40px -10px var(--primary)' 
                  }}
                >
                  CONTINUE TO LOGIN
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(239, 68, 68, 0.1)' }}
              >
                <XCircle className="w-10 h-10 text-red-500" />
              </motion.div>
              
              <h2 className="text-[20px] font-black mb-2" style={{ color: 'var(--store-text)' }}>
                Verification Failed
              </h2>
              <p className="text-[14px] mb-8" style={{ color: 'var(--store-text-muted)' }}>
                {error}
              </p>

              <div className="space-y-3">
                <Link href={getStorefrontPath(subdomain, '/login', typeof window !== 'undefined' ? window.location.host : undefined)}>
                  <Button
                    className="w-full h-14 text-[15px] font-black rounded-xl text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                    style={{ 
                      backgroundColor: 'var(--primary)', 
                      boxShadow: '0 10px 40px -10px var(--primary)' 
                    }}
                  >
                    GO TO LOGIN
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
                <p className="text-[13px]" style={{ color: 'var(--store-text-muted)' }}>
                  Need a new verification link?{' '}
                  <Link 
                    href={getStorefrontPath(subdomain, '/signup', typeof window !== 'undefined' ? window.location.host : undefined)}
                    className="font-bold"
                    style={{ color: 'var(--primary)' }}
                  >
                    Sign up again
                  </Link>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function StoreVerifyPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const resolvedParams = use(params);
  const subdomain = resolvedParams.subdomain;

  return (
    <Suspense fallback={<AuthSkeleton />}>
      <StoreVerifyContent subdomain={subdomain} />
    </Suspense>
  );
}
