'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ViewToggle from './ViewToggle';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketCardData {
  id: number;
  contract_address: string;
  name: string;
  description: string;
  category: string;
  lng: number;
  lat: number;
  end_time: number;
  resolution_time: number;
  resolved: boolean;
  outcome: boolean | null;
  liquidity: number;
  radius: number;
  address: string | null;
  created_at: string;
  price_yes?: number;
  price_no?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_STYLES: Record<string, { color: string; bg: string }> = {
  politics: { color: '#ef4444', bg: 'bg-red-500/10' },
  sports: { color: '#3b82f6', bg: 'bg-blue-500/10' },
  economics: { color: '#f59e0b', bg: 'bg-amber-500/10' },
  technology: { color: '#8b5cf6', bg: 'bg-purple-500/10' },
  general: { color: '#6366f1', bg: 'bg-indigo-500/10' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category.toLowerCase()] || CATEGORY_STYLES.general;
}

const CATEGORIES = [
  'all', 'politics', 'sports', 'economics', 'technology', 'general',
] as const;

// ---------------------------------------------------------------------------
// Market Card
// ---------------------------------------------------------------------------

function MarketCard({ market }: { market: MarketCardData }) {
  const catStyle = getCategoryStyle(market.category);
  const yesPercent = market.price_yes != null ? (market.price_yes * 100).toFixed(0) : '—';
  const noPercent = market.price_no != null ? (market.price_no * 100).toFixed(0) : '—';
  const yesNum = market.price_yes != null ? market.price_yes * 100 : 50;

  return (
    <Link href={`/market/${market.contract_address}`} className="block group">
      <Card className="glass rounded-xl p-4 h-full transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        {/* Category */}
        <div className="flex items-center justify-between mb-2">
          <Badge
            variant="secondary"
            className={`text-[10px] font-medium ${catStyle.bg}`}
            style={{ color: catStyle.color }}
          >
            {market.category}
          </Badge>
          {market.resolved && (
            <Badge variant="destructive" className="text-[10px]">
              Resolved
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
          {market.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{market.address || (market.lat != null ? `${market.lat.toFixed(4)}, ${market.lng.toFixed(4)}` : '—')}</span>
        </div>

        {/* Liquidity */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-3">
          <DollarSign className="w-3 h-3 shrink-0" />
          <span>{market.liquidity.toLocaleString()} USDC</span>
        </div>

        {/* YES/NO Prices */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-green-400">
              <TrendingUp className="w-3 h-3" />
              YES
            </span>
            <span className="font-semibold text-green-400">{yesPercent}%</span>
          </div>
          <Progress value={yesNum} className="h-1.5 bg-muted/30 [&>div]:bg-green-500/60" />
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-red-400">
              <TrendingDown className="w-3 h-3" />
              NO
            </span>
            <span className="font-semibold text-red-400">{noPercent}%</span>
          </div>
        </div>

        {/* Quick Buy Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[11px] border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-300"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/market/${market.contract_address}?buy=yes`;
            }}
          >
            Buy YES
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[11px] border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/market/${market.contract_address}?buy=no`;
            }}
          >
            Buy NO
          </Button>
        </div>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Markets List
// ---------------------------------------------------------------------------

interface MarketsListProps {
  /** Override view mode (optional, for embedding) */
  view?: 'map' | 'list';
  onViewChange?: (view: 'map' | 'list') => void;
}

export default function MarketsList({ view, onViewChange }: MarketsListProps) {
  const [markets, setMarkets] = useState<MarketCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMarkets = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('limit', '12');
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/markets?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const features = data.features || [];

      if (features.length < 12) setHasMore(false);
      else setHasMore(true);

      const newMarkets = features.map((f: any) => ({
        ...f.properties,
        lng: f.geometry?.coordinates?.[0] ?? 0,
        lat: f.geometry?.coordinates?.[1] ?? 0,
      }) as MarketCardData);

      // Fetch prices for each market
      const withPrices = await Promise.all(
        newMarkets.map(async (m: MarketCardData) => {
          try {
            const priceRes = await fetch(`/api/price-history/${m.contract_address}`);
            if (priceRes.ok) {
              const priceData = await priceRes.json();
              const prices = priceData.prices || priceData;
              const latest = Array.isArray(prices) ? prices[prices.length - 1] : prices;
              if (latest) {
                return { ...m, price_yes: latest.price_yes, price_no: latest.price_no };
              }
            }
          } catch { /* ignore */ }
          return m;
        })
      );

      if (append) {
        setMarkets((prev) => [...prev, ...withPrices]);
      } else {
        setMarkets(withPrices);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load markets');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchMarkets(1);
  }, [categoryFilter, searchQuery, fetchMarkets]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMarkets(nextPage, true);
  };

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ViewToggle view={view} onViewChange={onViewChange} />

        {/* Category filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="w-16 h-4 bg-muted/30 rounded mb-3" />
              <div className="w-full h-5 bg-muted/30 rounded mb-2" />
              <div className="w-3/4 h-3 bg-muted/20 rounded mb-3" />
              <div className="w-1/2 h-3 bg-muted/20 rounded mb-4" />
              <div className="space-y-2 mb-3">
                <div className="w-full h-2 bg-muted/20 rounded" />
                <div className="w-full h-2 bg-muted/20 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-7 bg-muted/20 rounded" />
                <div className="flex-1 h-7 bg-muted/20 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchMarkets(1)}>
            Retry
          </Button>
        </div>
      ) : markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <div className="text-4xl">📭</div>
          <p className="text-sm text-muted-foreground">No markets found</p>
          <Link href="/?view=map">
            <Button variant="outline" size="sm">
              Create a market on the map
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((market) => (
              <MarketCard key={market.contract_address} market={market} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Loader2 className="w-4 h-4" />
                )}
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
