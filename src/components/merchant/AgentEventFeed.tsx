"use client";

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MerchantAgentEvent } from '@/types';

export function AgentEventFeed() {
  const [events, setEvents] = useState<MerchantAgentEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/merchant/agent-control', {
        credentials: 'include',
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      setEvents(payload.events || []);
    };

    load();
  }, []);

  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border bg-secondary/30 px-6 py-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-bold tracking-tight">Recent Agent Changes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent agent activity yet.</p>
        ) : (
          <div className="space-y-4">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-r-2xl border-l-2 border-border bg-secondary/15 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{event.summary}</p>
                <p className="text-[11px] text-muted-foreground mt-2">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
