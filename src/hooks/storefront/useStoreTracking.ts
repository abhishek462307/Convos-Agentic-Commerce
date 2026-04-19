import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function useStoreTracking(
  subdomain: string,
  sessionId: string,
  consumerEmail: string | null
) {
  const searchParams = useSearchParams();

  const trackEvent = useCallback((type: string, data: Record<string, unknown>) => {
    fetch('/api/track/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: type,
        event_data: data,
        consumer_email: consumerEmail,
        subdomain,
      }),
    }).catch(() => {});
  }, [consumerEmail, subdomain]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const isPreview = searchParams.get('preview') === 'true';
    if (isPreview) return;

    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');

    trackEvent('page_view', {
      path: window.location.pathname,
      referrer: document.referrer,
      sessionId,
    });

    if (!utmSource && !utmMedium && !utmCampaign) {
      return;
    }

    const utmData = {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(`utm_data_${subdomain}`, JSON.stringify(utmData));
    trackEvent('ad_referral', utmData);
  }, [searchParams, sessionId, subdomain, trackEvent]);
}
