'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, DollarSign, Activity, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminStats {
  totalMarkets: number;
  totalLiquidityUSDC: number;
  activeMarkets: number;
  resolvedMarkets: number;
  topMarketsByLiquidity: { name: string; liquidity: number }[];
  liquidityByCategory: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const PIE_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
const CHART_TOOLTIP_STYLE = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--foreground))',
  fontSize: 12,
};

// ---------------------------------------------------------------------------
// Metric cards config
// ---------------------------------------------------------------------------

const METRICS = [
  { key: 'totalMarkets', label: 'Total Markets', icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { key: 'totalLiquidityUSDC', label: 'Total Liquidity', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', format: (v: number) => `$${(v || 0).toLocaleString()}` },
  { key: 'activeMarkets', label: 'Active Markets', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'resolvedMarkets', label: 'Resolved', icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

// ---------------------------------------------------------------------------
// Mock daily activity (for demo)
// ---------------------------------------------------------------------------

function generateDailyActivity(): { day: string; trades: number; volume: number }[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    day,
    trades: Math.floor(Math.random() * 50) + 10,
    volume: Math.floor(Math.random() * 10000) + 1000,
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyActivity] = useState(generateDailyActivity);

  const fetchStats = () => {
    setLoading(true);
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass rounded-xl p-5 animate-pulse">
              <div className="w-16 h-3 bg-muted/30 rounded mb-3" />
              <div className="w-12 h-7 bg-muted/30 rounded" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass rounded-xl p-5 animate-pulse">
              <div className="w-32 h-4 bg-muted/30 rounded mb-4" />
              <div className="w-full h-[250px] bg-muted/20 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-muted-foreground">Failed to load stats</p>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  const pieData = Object.entries(stats.liquidityByCategory).map(([name, value]) => ({ name, value }));
  const barData = stats.topMarketsByLiquidity.map((m) => ({
    name: m.name.length > 18 ? m.name.slice(0, 18) + '...' : m.name,
    liquidity: m.liquidity,
  }));

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
        <Button variant="outline" size="sm" onClick={fetchStats} className="h-8">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const rawValue = (stats as any)[metric.key];
          const displayValue = metric.format ? metric.format(rawValue) : rawValue;
          return (
            <Card key={metric.key} className="glass rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg ${metric.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${metric.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{displayValue}</div>
              <div className="text-xs text-muted-foreground mt-1">{metric.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liquidity by Category */}
        <Card className="glass rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Liquidity by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-12">No data</div>
          )}
        </Card>

        {/* Top Markets */}
        <Card className="glass rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Top Markets by Liquidity</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ angle: -15 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="liquidity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-12">No data</div>
          )}
        </Card>

        {/* Daily Activity */}
        <Card className="glass rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Daily Activity (7 days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="trades" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Trades" />
              <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Volume (USDC)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Summary */}
        <Card className="glass rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Category Summary</h3>
          <div className="space-y-3">
            {Object.entries(stats.liquidityByCategory).length > 0 ? (
              Object.entries(stats.liquidityByCategory).map(([category, liquidity], i) => {
                const total = Object.values(stats.liquidityByCategory).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((liquidity / total) * 100).toFixed(1) : '0';
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-foreground font-medium capitalize">{category}</span>
                      <span className="text-muted-foreground text-xs">${liquidity.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">No data</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
