import { useMemo } from 'react';

export function useStoreSession(subdomain: string) {
  const sessionId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem(`session_${subdomain}`);
      if (existing) {
        return existing;
      }

      const nextSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(`session_${subdomain}`, nextSessionId);
      return nextSessionId;
    }

    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }, [subdomain]);

  return { sessionId };
}
