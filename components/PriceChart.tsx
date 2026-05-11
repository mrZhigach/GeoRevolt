'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PricePoint {
  timestamp: number;
  price_yes: number;
  price_no: number;
}

interface Props {
  data: PricePoint[];
}

export default function PriceChart({ data }: Props) {
  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data.slice(-60)}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#64748b" fontSize={9} />
        <YAxis domain={[0, 1]} stroke="#64748b" fontSize={9} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, fontSize: 11, color: '#e2e8f0' }}
          labelFormatter={(v: any) => typeof v === 'number' ? new Date(v * 1000).toLocaleString() : String(v)}
        />
        <Line type="monotone" dataKey="price_yes" stroke="#22c55e" dot={false} strokeWidth={1.5} name="YES" />
        <Line type="monotone" dataKey="price_no" stroke="#ef4444" dot={false} strokeWidth={1.5} name="NO" />
      </LineChart>
    </ResponsiveContainer>
  );
}
