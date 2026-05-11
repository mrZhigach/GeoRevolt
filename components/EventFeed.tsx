'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { X } from 'lucide-react';

interface EventItem {
  id: number;
  market_id: number | null;
  event_type: string;
  data: Record<string, any>;
  created_at: string;
}

export default function EventFeed() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch {}
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  // Collapsed state: show a small pill button in the column
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="hidden lg:block w-full text-left px-3 py-2 text-[11px] text-muted-foreground bg-card/80 border border-border/40 rounded-xl shadow-lg backdrop-blur hover:bg-accent/10 transition-colors"
      >
        Events ({events.length})
      </button>
    );
  }

  return (
    <Card
      size="sm"
      className="glass rounded-xl shadow-lg hidden lg:block"
    >
      <CardHeader className="flex flex-row items-center justify-between py-2">
        <span className="text-xs font-semibold text-foreground">Live Events</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Collapse events"
        >
          <X className="w-3 h-3" />
        </button>
      </CardHeader>
      <CardContent className="max-h-48 overflow-y-auto space-y-1">
        {events.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No events yet. Create a market to get started.
          </div>
        )}
        {events.map((ev) => (
          <div key={ev.id} className="py-1.5 border-b border-border/20 last:border-0">
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/90">
              <EventIcon type={ev.event_type} />
              <span className="truncate">{formatEventText(ev)}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 ml-5">
              {new Date(ev.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EventIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    market_created: '🆕',
    trade: '🔄',
    market_resolved: '✅',
    liquidity_added: '💰',
  };
  return <span className="shrink-0">{icons[type] || '📌'}</span>;
}

function formatEventText(ev: EventItem): string {
  const d = ev.data;
  switch (ev.event_type) {
    case 'market_created':
      return `Market "${d.name}" created`;
    case 'trade':
      return `${d.side} trade: ${d.amount} USDC on "${d.market_name}"`;
    case 'market_resolved':
      return `Market "${d.market_name}" → ${d.outcome ? 'YES' : 'NO'}`;
    case 'liquidity_added':
      return `Liquidity added to "${d.market_name}": ${d.amount} USDC`;
    default:
      return ev.event_type;
  }
}
