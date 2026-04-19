"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useStorefrontRealtime(merchantId: string | undefined, consumerEmail: string | null) {
  const [activeIntents, setActiveIntents] = useState<any[]>([]);
  const [activePlans, setActivePlans] = useState<any[]>([]);

  useEffect(() => {
    if (merchantId) {
      const channelIdentity = consumerEmail ?? 'anonymous';
      const intentFilter = consumerEmail 
        ? [`merchant_id=eq.${merchantId}`, `consumer_email=eq.${consumerEmail}`].join('.and.')
        : `merchant_id=eq.${merchantId}`;

      const intentsChannel = supabase
        .channel(`intents-${merchantId}-${channelIdentity}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'customer_intents',
          filter: intentFilter
        }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setActiveIntents(prev => {
              const exists = prev.find(i => i.id === payload.new.id);
              if (exists) return prev.map(i => i.id === payload.new.id ? payload.new : i);
              return [payload.new, ...prev];
            });
          }
        })
        .subscribe();

      const plansChannel = supabase
        .channel(`plans-${merchantId}-${channelIdentity}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'agent_plans'
        }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setActivePlans(prev => {
              const exists = prev.find(p => p.id === payload.new.id);
              if (exists) return prev.map(p => p.id === payload.new.id ? payload.new : p);
              return [payload.new, ...prev];
            });
          }
        })
        .subscribe();

      return () => { 
        supabase.removeChannel(intentsChannel); 
        supabase.removeChannel(plansChannel);
      };
    }
  }, [merchantId, consumerEmail]);

  return { activeIntents, activePlans };
}
