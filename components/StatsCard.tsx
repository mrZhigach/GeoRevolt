'use client';

import { useState, useEffect } from 'react';
import { BarChart3, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatsData {
  totalMarkets: number;
  totalLiquidityUSDC: number;
  activeMarkets: number;
  resolvedMarkets: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatsCard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch stats from API every 30 seconds
  // -----------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data: StatsData = await res.json();
        if (mounted) {
          setStats(data);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Error state: render nothing to avoid breaking UI
  // -----------------------------------------------------------------------
  if (error) return null;

  // -----------------------------------------------------------------------
  // Loading state: skeleton with animate-pulse
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <Card className="card-glass fixed bottom-6 right-6 z-10 max-w-xs hidden sm:block animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-muted/30 rounded" />
              <div className="h-3 w-16 bg-muted/20 rounded" />
            </div>
            <div className="h-8 w-8 bg-muted/30 rounded-full" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-24 bg-muted/30 rounded" />
              <div className="h-3 w-20 bg-muted/20 rounded" />
            </div>
            <div className="h-8 w-8 bg-muted/30 rounded-full" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-16 bg-muted/30 rounded" />
              <div className="h-3 w-12 bg-muted/20 rounded" />
            </div>
            <div className="h-8 w-8 bg-muted/30 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // -----------------------------------------------------------------------
  // Data state: glass card with metrics
  // -----------------------------------------------------------------------
  if (!stats) return null;

  return (
    <Card className="card-glass fixed bottom-6 right-6 z-10 max-w-xs hidden sm:block">
      <CardContent className="p-4 space-y-3">
        {/* Total Markets */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              Total Markets
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {stats.totalMarkets.toLocaleString()}
          </span>
        </div>

        {/* Total Liquidity */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <DollarSign className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              Total Liquidity
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            ${(stats.totalLiquidityUSDC || 0).toLocaleString()}
          </span>
        </div>

        {/* Active Markets */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              Active Markets
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {stats.activeMarkets.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
