"use client"

import { useState, useEffect, useCallback } from 'react';
import type { Merchant, MerchantContext } from '@/types';

export function useMerchant() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [context, setContext] = useState<MerchantContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const fetchMerchant = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/merchant/context', {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        setStatus(response.status);
        setError(payload.error || 'Failed to load merchant');
        setMerchant(null);
        setContext(null);
        setLoading(false);
        return;
      }

      const data = await response.json() as MerchantContext;
      setContext(data);
      setMerchant(data.merchant);
      setStatus(200);
      setError(null);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load merchant';
      setStatus(500);
      setError(message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMerchant();
  }, [fetchMerchant]);

  const refetch = useCallback(() => {
    setError(null);
    setStatus(null);
    fetchMerchant();
  }, [fetchMerchant]);

  return {
    merchant,
    context,
    loading,
    error,
    status,
    refetch,
  };
}
