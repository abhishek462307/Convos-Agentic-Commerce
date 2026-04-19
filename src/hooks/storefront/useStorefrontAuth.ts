import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStoreSession } from '@/hooks/storefront/useStoreSession';
import { useStoreTracking } from '@/hooks/storefront/useStoreTracking';

interface AuthInfo {
  currentUser: any;
  setCurrentUser: (user: any) => void;
  consumerEmail: string | null;
  setConsumerEmail: (email: string | null) => void;
  sessionId: string;
  interactionStage: 'landing' | 'active';
  setInteractionStage: (stage: 'landing' | 'active') => void;
  logout: () => Promise<void>;
}

export function useStorefrontAuth(subdomain: string): AuthInfo {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [consumerEmail, setConsumerEmail] = useState<string | null>(null);
  const { sessionId } = useStoreSession(subdomain);
  const [interactionStage, setInteractionStage] = useState<'landing' | 'active'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`interaction_stage_${subdomain}`) === 'active' ? 'active' : 'landing';
    }
    return 'landing';
  });

  useEffect(() => {
    let isMounted = true;
    const savedEmail = localStorage.getItem(`consumer_email_${subdomain}`);
    if (savedEmail) {
      setConsumerEmail(savedEmail);
    }

    const savedAuth = localStorage.getItem(`store_auth_${subdomain}`);
    if (savedAuth) {
      try {
        const session = JSON.parse(savedAuth);
        if (session.access_token && session.refresh_token) {
          try {
            const payload = JSON.parse(atob(session.access_token.split('.')[1]));
            if (payload.exp && payload.exp * 1000 < Date.now() - 86400000) {
              localStorage.removeItem(`store_auth_${subdomain}`);
              return;
            }
          } catch {}
          supabase.auth
            .setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            })
            .then(({ data, error }) => {
              if (!isMounted) return;
              if (error || !data.session) {
                localStorage.removeItem(`store_auth_${subdomain}`);
                setCurrentUser(null);
              } else {
                localStorage.setItem(
                  `store_auth_${subdomain}`,
                  JSON.stringify({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    user: session.user,
                  })
                );
                setCurrentUser(session.user);
                if (session.user?.email) setConsumerEmail(session.user.email);
              }
            });
        } else if (session.user) {
          setCurrentUser(session.user);
        }
      } catch {
        localStorage.removeItem(`store_auth_${subdomain}`);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [subdomain]);

  useEffect(() => {
    if (consumerEmail) {
      localStorage.setItem(`consumer_email_${subdomain}`, consumerEmail);
    }
  }, [consumerEmail, subdomain]);

  useEffect(() => {
    localStorage.setItem(`interaction_stage_${subdomain}`, interactionStage);
  }, [interactionStage, subdomain]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(`store_auth_${subdomain}`);
    localStorage.removeItem(`consumer_email_${subdomain}`);
    setCurrentUser(null);
    setConsumerEmail(null);
    setInteractionStage('landing');
  }, [subdomain]);

  useStoreTracking(subdomain, sessionId, consumerEmail);

  return {
    currentUser,
    setCurrentUser,
    consumerEmail,
    setConsumerEmail,
    sessionId,
    interactionStage,
    setInteractionStage,
    logout,
  };
}
