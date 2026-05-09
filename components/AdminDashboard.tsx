'use client';

import { useState, useEffect } from 'react';

interface AdminStats {
  totalMarkets: number;
  totalLiquidityUSDC: number;
  activeMarkets: number;
  resolvedMarkets: number;
  topMarketsByLiquidity: { name: string; liquidity: number }[];
  liquidityByCategory: Record<string, number>;
}

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error('fetch stats error:', e);
        setLoading(false);
      });
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading stats...</div>;
  }

  if (!stats) {
    return <div style={{ color: '#ef4444', textAlign: 'center', padding: 40 }}>Failed to load stats</div>;
  }

  const pieData = Object.entries(stats.liquidityByCategory).map(([name, value]) => ({ name, value }));
  const barData = stats.topMarketsByLiquidity.map((m, i) => ({ name: m.name.length > 20 ? m.name.slice(0, 20) + '...' : m.name, liquidity: m.liquidity }));

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={fetchStats} style={{
          background: '#6366f1', border: 'none', color: '#fff', borderRadius: 6,
          padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
        }}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Total Markets" value={stats.totalMarkets} color="#6366f1" />
        <MetricCard label="Total Liquidity (USDC)" value={`$${stats.totalLiquidityUSDC.toFixed(2)}`} color="#22c55e" />
        <MetricCard label="Active Markets" value={stats.activeMarkets} color="#f59e0b" />
        <MetricCard label="Resolved Markets" value={stats.resolvedMarkets} color="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#94a3b8' }}>Liquidity by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`) as any}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 40 }}>No data</div>
          )}
        </div>

        <div style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#94a3b8' }}>Top Markets by Liquidity</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ angle: -20 }} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                <Bar dataKey="liquidity" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 40 }}>No data</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: '#16213e', borderRadius: 12, padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
