'use client';

import { useState, useEffect } from 'react';

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

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} style={{
        position: 'absolute', top: 12, right: 12, zIndex: 5,
        background: '#1a1a2e', border: '1px solid #334155', color: '#94a3b8',
        borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 11,
      }}>
        Events ({events.length})
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, zIndex: 5,
      width: 300, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
      background: '#1a1a2e', border: '1px solid #334155', borderRadius: 8,
      padding: 12, fontSize: 12, color: '#cbd5e1',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Live Events</span>
        <button onClick={() => setCollapsed(true)} style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16,
        }}>×</button>
      </div>
      {events.length === 0 && (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 16 }}>
          No events yet. Create a market to get started.
        </div>
      )}
      {events.map((ev) => (
        <div key={ev.id} style={{
          padding: '8px 0', borderBottom: '1px solid #1e293b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <EventIcon type={ev.event_type} />
            <span>{formatEventText(ev)}</span>
          </div>
          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
            {new Date(ev.created_at).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    market_created: '🆕',
    trade: '🔄',
    market_resolved: '✅',
    liquidity_added: '💰',
  };
  return <span>{icons[type] || '📌'}</span>;
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
